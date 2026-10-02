#!/bin/bash
# Option B / H2 (20261005100000) — history-only entries: database tests on a disposable local Postgres 17 (T1).
# Builds every migration up to the integrity one, snapshots the normal insert functions and the audit allowlist, applies
# H2, then runs the contract v5 proof cases (T1-1..T1-6) and T3's conditions 1, 3 and 4. Fictional data only; never
# connects to Practice or production; everything is deleted on exit.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../../.." && pwd)
PORT=${ZMR_H2_PGPORT:-55473}; PG=/opt/homebrew/opt/postgresql@17/bin
H2="$REPO/supabase/migrations/20261005100000_mortgage_history_entries.sql"
WORK=$(mktemp -d /tmp/zmr-mortgage-history.XXXXXX)
cleanup() { $PG/pg_ctl -D "$WORK/data" stop -m fast >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT
lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1 && { echo "port $PORT busy; set ZMR_H2_PGPORT"; exit 2; }
$PG/initdb -D "$WORK/data" -U postgres --auth=trust >/dev/null || exit 2
$PG/pg_ctl -D "$WORK/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$WORK/pg.log" start >/dev/null || exit 2; sleep 1
PSQL="$PG/psql -h 127.0.0.1 -p $PORT -U postgres -X -q -t -A"
$PSQL -d postgres -c "create database zmr" >/dev/null
Q="$PSQL -d zmr"
$Q -v ON_ERROR_STOP=1 -f "$REPO/supabase/tests/entity_responsibility/bootstrap.sql" >/dev/null || exit 2
for f in "$REPO"/supabase/migrations/*.sql; do [ "$f" = "$H2" ] && continue
  $Q -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>"$WORK/err" || { echo "FAILED: $f"; cat "$WORK/err"; exit 2; }; done

PASS=0; FAIL=0
ok()  { echo "PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "FAIL  $1   [$2]"; FAIL=$((FAIL+1)); }
check() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected '$3' got '$2'"; fi; }

# --- snapshots before H2 (T3 conditions 3 and 4) ---
fdef() { $Q -c "select pg_get_functiondef('public.$1()'::regprocedure)"; }
fdef mortgage_payment_apply_locked > "$WORK/pay.before"; fdef mortgage_escrow_apply_locked > "$WORK/esc.before"
# Independent parse of the allowlist (handles both constraint forms); never shared with the migration's code.
allow() { local d; d=$($Q -c "select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.audit_log'::regclass and conname='audit_log_table_name_check'")
  if echo "$d" | grep -q "'{"; then echo "$d" | sed -E "s/.*'\{([^}]*)\}'.*/\1/" | tr ',' '\n' | tr -d ' "'; else echo "$d" | grep -oE "'[a-z_]+'" | tr -d "'"; fi | sort -u | paste -sd, -; }
ALLOW_BEFORE=$(allow)
python3 "$HERE/generate_migration.py" "$WORK/regen.sql" >/dev/null && cmp -s "$WORK/regen.sql" "$H2"; GEN_CURRENT=$?
$Q -v ON_ERROR_STOP=1 -f "$H2" >/dev/null 2>"$WORK/err" || { echo "FAILED: H2"; cat "$WORK/err"; exit 2; }
echo "== H2 applied; migrations: $(ls "$REPO"/supabase/migrations/*.sql | wc -l | tr -d ' ')   HEAD $(git -C "$REPO" rev-parse --short HEAD)   $(date -u +%FT%TZ)"
check "generated migration matches its generator (no hand edits)" "$GEN_CURRENT" "0"

echo "== T3 condition 3: normal insert functions identical to 20261004100000 except the duplicate check"
fdef mortgage_payment_apply_locked > "$WORK/pay.after"; fdef mortgage_escrow_apply_locked > "$WORK/esc.after"
diff "$WORK/pay.before" "$WORK/pay.after" > "$WORK/pay.diff"; diff "$WORK/esc.before" "$WORK/esc.after" > "$WORK/esc.diff"
check "payment insert: exactly one added line, nothing removed" "$(grep -c '^>' "$WORK/pay.diff")/$(grep -c '^<' "$WORK/pay.diff")" "1/0"
check "payment insert: the added line is the duplicate rule" "$(grep -c "^> *perform public.mortgage_enforce_duplicate_rule('payment'" "$WORK/pay.diff")" "1"
check "escrow insert: exactly one added line, nothing removed" "$(grep -c '^>' "$WORK/esc.diff")/$(grep -c '^<' "$WORK/esc.diff")" "1/0"
check "escrow insert: the added line is the duplicate rule" "$(grep -c "^> *perform public.mortgage_enforce_duplicate_rule('escrow'" "$WORK/esc.diff")" "1"
check "duplicate rule runs before the balance update (payment)" "$( awk '/mortgage_enforce_duplicate_rule/{d=NR} /update public.mortgage_details/{u=NR} END{print (d>0 && d<u) ? "before" : "after"}' "$WORK/pay.after")" "before"
check "duplicate rule runs before the balance update (escrow)" "$( awk '/mortgage_enforce_duplicate_rule/{d=NR} /update public.mortgage_details/{u=NR} END{print (d>0 && d<u) ? "before" : "after"}' "$WORK/esc.after")" "before"
mkdir -p "$HERE/evidence"; { echo "# pg_get_functiondef diff, before vs after 20261005100000 (T3 condition 3)"; echo "## mortgage_payment_apply_locked"; cat "$WORK/pay.diff"; echo "## mortgage_escrow_apply_locked"; cat "$WORK/esc.diff"; } > "$HERE/evidence/normal-insert-function-diff.txt"

echo "== T3 condition 4: audit allowlist keeps every existing table name"
ALLOW_AFTER=$(allow)
MISSING=$(comm -23 <(echo "$ALLOW_BEFORE" | tr ',' '\n' | sort) <(echo "$ALLOW_AFTER" | tr ',' '\n' | sort) | tr '\n' ' ')
check "no previously allowed table name dropped" "${MISSING:-none}" "none"
for t in mortgage_payments mortgage_escrow_transactions mortgage_details mortgage_history_payments mortgage_history_escrow; do
  check "allowlist includes $t" "$(echo ",$ALLOW_AFTER," | grep -c ",$t,")" "1"; done
check "allowlist grew by exactly the two history tables" "$(( $(echo "$ALLOW_AFTER" | tr ',' '\n' | wc -l) - $(echo "$ALLOW_BEFORE" | tr ',' '\n' | wc -l) ))" "2"
check "allowlist before H2 was read (non-empty, includes the integrity tables)" "$(echo ",$ALLOW_BEFORE," | grep -c ',mortgage_payments,')$(echo ",$ALLOW_BEFORE," | grep -c ',mortgage_details,')" "11"
N_OK=0; N_ALL=0; for t in $(echo "$ALLOW_BEFORE" | tr ',' ' '); do N_ALL=$((N_ALL+1))
  $Q -v ON_ERROR_STOP=1 -c "begin; with a as (insert into accounts (name) values ('ZMR-TEST allowlist probe') returning id) insert into audit_log (account_id, table_name, record_id, field_name) select id, '$t', gen_random_uuid(), 'allowlist-test' from a; rollback;" >/dev/null 2>&1 && N_OK=$((N_OK+1)); done
check "every previously allowed table name still accepts an audit row ($N_ALL names)" "$N_OK" "$N_ALL"

echo "== T3 condition 1: duplicate-count routine is private"
FN="public.mortgage_enforce_duplicate_rule(text,uuid,uuid,uuid,date,numeric,text,integer)"
check "authenticated cannot execute it" "$($Q -c "select has_function_privilege('authenticated','$FN','execute')")" "f"
check "anon cannot execute it" "$($Q -c "select has_function_privilege('anon','$FN','execute')")" "f"
check "PUBLIC has no execute" "$($Q -c "select count(*) from information_schema.routine_privileges where routine_name='mortgage_enforce_duplicate_rule' and grantee='PUBLIC'")" "0"

# --- fixtures ---
ACC=a0000000-0000-0000-0000-00000000000a; USR=aaaaaaaa-0000-0000-0000-00000000000a
ACC2=b0000000-0000-0000-0000-00000000000b; USR2=bbbbbbbb-0000-0000-0000-00000000000b
AS="set role authenticated; set request.jwt.claim.sub='$USR';"; AS2="set role authenticated; set request.jwt.claim.sub='$USR2';"
$Q -c "insert into auth.users (id, email) values ('$USR','zmr-test-h2a@example.test'),('$USR2','zmr-test-h2b@example.test');
insert into accounts (id, name) values ('$ACC','ZMR-TEST H2 A'),('$ACC2','ZMR-TEST H2 B');
insert into account_members (account_id, user_id, role) values ('$ACC','$USR','owner'),('$ACC2','$USR2','owner');" >/dev/null
mk() {  # [as_of] -> property id with one active loan (principal 150000, escrow 2000); as_of for both balances or none
  local p; p=$($Q -c "select gen_random_uuid()")
  $Q -c "insert into properties (id, account_id, address) values ('$p','$ACC','ZMR-TEST H2 ${p:0:8}');
  insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, escrow_balance, interest_rate, monthly_payment, loan_start_date, term_years)
  values ('$ACC','$p','ZMR-TEST Bank',200000,150000,2000,6.5,1264.14,'2020-01-01',30);
  ${1:+update mortgage_details set principal_as_of = '$1', escrow_as_of = '$1' where property_id = '$p';}" >/dev/null
  echo "$p"
}
loan() { $Q -c "select id from mortgage_details where property_id='$1' and not voided"; }
loanfp() { $Q -c "select md5(to_jsonb(d)::text) from mortgage_details d where id='$1'"; }
effc() { $Q -c "select (select count(*) from mortgage_balance_effects where mortgage_id='$1')||'/'||(select count(*) from mortgage_balance_review_causes where review_mortgage_id='$1')"; }
st() { $Q -c "${3:-$AS} do \$x\$ begin $1; raise notice 'R:OK'; exception when others then raise notice 'R:%', sqlstate; end \$x\$;" 2>&1 | grep -o 'R:[A-Z0-9]*' | cut -d: -f2; }
hpay() { echo "insert into mortgage_history_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount${5:+, duplicate_ack_matches}) values ('${4:-$ACC}','$1','$2',$3,$(echo "$3 - 800" | bc),800${5:+, $5})"; }
npay() { echo "insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount${4:+, duplicate_ack_matches}) values ('$ACC','$1','$2',$3,$(echo "$3 - 800" | bc),800${4:+, $4})"; }
hesc() { echo "insert into mortgage_history_escrow (account_id, property_id, transaction_date, transaction_type, amount${5:+, duplicate_ack_matches}) values ('$ACC','$1','$2','$3',$4${5:+, $5})"; }
nesc() { echo "insert into mortgage_escrow_transactions (account_id, property_id, transaction_date, transaction_type, amount${5:+, duplicate_ack_matches}) values ('$ACC','$1','$2','$3',$4${5:+, $5})"; }

echo "== T1-1 invariant: history entries never touch the loan, effects or causes"
P=$(mk 2026-09-01); L=$(loan "$P"); FP=$(loanfp "$L"); E=$(effc "$L")
check "history payment on/before the statement date inserts" "$(st "$(hpay "$P" 2026-08-01 1264.14)")" "OK"
check "history escrow item inserts" "$(st "$(hesc "$P" 2026-08-15 disbursement 900)")" "OK"
check "loan row byte-identical after both inserts" "$(loanfp "$L")" "$FP"
check "no effects or causes created" "$(effc "$L")" "$E"
check "void of the history payment leaves the loan identical" "$(st "update mortgage_history_payments set voided = true, void_reason = 'test' where property_id = '$P'")/$(loanfp "$L")/$(effc "$L")" "OK/$FP/$E"
check "declared_as_of comes from the loan (client value ignored)" "$($Q -c "$AS insert into mortgage_history_escrow (account_id, property_id, transaction_date, transaction_type, amount, declared_as_of) values ('$ACC','$P','2026-08-20','deposit',50,'1999-01-01') returning declared_as_of" | tail -1)" "2026-09-01"

echo "== T1-2 eligibility (ZM5MC)"
P0=$(mk)
check "no statement date -> refused" "$(st "$(hpay "$P0" 2026-08-01 1000)")" "ZM5MC"
check "dated after the statement date -> refused" "$(st "$(hpay "$P" 2026-09-02 1000)")" "ZM5MC"
check "on the statement date -> allowed" "$(st "$(hpay "$P" 2026-09-01 1001)")" "OK"
PV=$(mk 2026-09-01); LV=$(loan "$PV"); $Q -c "update mortgage_details set voided = true, voided_at = now() where id='$LV'" >/dev/null
check "property with no active loan -> refused" "$(st "$(hpay "$PV" 2026-08-01 1000)")" "ZM5MC"
$Q -c "insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, escrow_balance, interest_rate, monthly_payment, loan_start_date, term_years) values ('$ACC','$PV','ZMR-TEST New Bank',100000,90000,0,6,800,'2024-01-01',30); update mortgage_details set principal_as_of='2026-09-01', escrow_as_of='2026-09-01' where property_id='$PV' and not voided" >/dev/null
check "targeting the earlier (voided) loan -> refused" "$(st "insert into mortgage_history_payments (account_id, property_id, mortgage_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$PV','$LV','2026-08-01',1000,200,800)")" "ZM5MC"

echo "== T1-3 permissions (mirror mortgage_payments; append-only)"
check "owner reads own history rows" "$($Q -c "$AS select count(*) from mortgage_history_payments where property_id='$P'" | tail -1)" "2"
check "another account's member sees nothing" "$($Q -c "$AS2 select count(*) from mortgage_history_payments" | tail -1)/$($Q -c "$AS2 select count(*) from mortgage_history_escrow" | tail -1)" "0/0"
check "another account's member can't void them" "$($Q -c "$AS2 update mortgage_history_escrow set voided = true returning 1" | grep -c 1)" "0"
check "another account's member can't insert into this account" "$(st "$(hpay "$P" 2026-08-02 1500)" x "$AS2")" "42501"
check "anon can't read" "$(st "perform 1 from mortgage_history_payments" x "set role anon;")" "42501"
check "owner can't delete (no DELETE grant)" "$(st "delete from mortgage_history_escrow where property_id='$P'")" "42501"
check "no-delete trigger as a server role too" "$(st "delete from mortgage_history_escrow where property_id='$P'" x "set role postgres;")" "ZM5M2"
check "policies identical in form to mortgage_payments" "$($Q -c "select count(distinct (cmd, qual, with_check)) from pg_policies where tablename in ('mortgage_payments','mortgage_history_payments','mortgage_history_escrow')")" "1"
check "authenticated privileges = mortgage_payments minus DELETE/TRUNCATE" "$($Q -c "select string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants where grantee='authenticated' and table_name='mortgage_history_payments'")" "$($Q -c "select string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants where grantee='authenticated' and table_name='mortgage_payments' and privilege_type not in ('DELETE','TRUNCATE')")"
check "direct call of the private routine as authenticated -> refused" "$(st "perform public.mortgage_enforce_duplicate_rule('payment','$ACC','$P','$L','2026-08-01',1264.14,null,null)")" "42501"

echo "== T1-4 duplicates (rule 5: loan + history + same-property unlinked, under the loan lock)"
D=$(mk 2026-09-01); DL=$(loan "$D")
check "normal payment recorded" "$(st "$(npay "$D" 2026-08-10 1264.14)")" "OK"
FPD=$(loanfp "$DL"); ED=$(effc "$DL")
check "history entry identical to a normal one -> ZM5MA" "$(st "$(hpay "$D" 2026-08-10 1264.14)")" "ZM5MA"
check "same total, different split -> still ZM5MA" "$(st "insert into mortgage_history_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$D','2026-08-10',1264.14,500,764.14)")" "ZM5MA"
check "history recorded on another date" "$(st "$(hpay "$D" 2026-08-11 1264.14)")" "OK"
check "normal entry identical to a history one -> ZM5MA (refused BEFORE any balance update)" "$(st "$(npay "$D" 2026-08-11 1264.14)")/$(loanfp "$DL")" "ZM5MA/$(loanfp "$DL")"
FPD2=$(loanfp "$DL")
check "...loan unchanged by the refused insert" "$(st "$(npay "$D" 2026-08-11 1264.14)" >/dev/null; loanfp "$DL")" "$FPD2"
check "refusal detail carries per-source counts" "$($Q -c "$AS do \$x\$ begin $(npay "$D" 2026-08-11 1264.14); exception when others then raise notice 'D:%', (select 1) ; end \$x\$;" >/dev/null 2>&1; $Q -c "$AS do \$x\$ declare d text; begin $(npay "$D" 2026-08-11 1264.14); exception when others then get stacked diagnostics d = pg_exception_detail; raise notice 'D:%', d; end \$x\$;" 2>&1 | grep -o 'D:.*' | cut -c3-)" '{"loan" : 0, "history" : 1, "unlinked" : 0, "total" : 1}'
check "override with the shown count -> recorded" "$(st "$(npay "$D" 2026-08-11 1264.14 1)")" "OK"
check "stale override (count now 2, ack 1) -> ZM5MA again" "$(st "$(hpay "$D" 2026-08-11 1264.14 "$ACC" 1)")" "ZM5MA"
check "history override with the current count (2) -> recorded" "$(st "$(hpay "$D" 2026-08-11 1264.14 "$ACC" 2)")" "OK"
check "override when nothing matches -> ZM5MB, nothing saved" "$(st "$(hpay "$D" 2026-08-12 1264.14 "$ACC" 1)")/$($Q -c "select count(*) from mortgage_history_payments where property_id='$D' and payment_date='2026-08-12'")" "ZM5MB/0"
st "update mortgage_history_payments set voided = true where property_id='$D' and payment_date='2026-08-11'" >/dev/null
st "update mortgage_payments set voided = true where property_id='$D' and payment_date='2026-08-11'" >/dev/null
check "voided entries never block" "$(st "$(hpay "$D" 2026-08-11 1264.14)")" "OK"
check "different amount -> no match" "$(st "$(hpay "$D" 2026-08-10 1300)")" "OK"
st "$(nesc "$D" 2026-08-20 deposit 500)" >/dev/null
check "escrow: other type doesn't match" "$(st "$(hesc "$D" 2026-08-20 disbursement 500)")" "OK"
check "escrow: same type matches -> ZM5MA" "$(st "$(hesc "$D" 2026-08-20 deposit 500)")" "ZM5MA"
D2=$(mk 2026-09-01)
check "another loan never matches" "$(st "$(hpay "$D2" 2026-08-10 1264.14)")" "OK"
# unlinked older entry (pre-integrity row: mortgage_id NULL) on D, and one on D2 (other property)
$Q -c "alter table mortgage_payments disable trigger user; insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$D','2026-07-01',1264.14,464.14,800),('$ACC','$D2','2026-07-02',1264.14,464.14,800); alter table mortgage_payments enable trigger user" >/dev/null
UNL=$($Q -c "select md5(to_jsonb(p)::text) from mortgage_payments p where property_id='$D' and mortgage_id is null")
check "unlinked same-property entry counted -> ZM5MA" "$(st "$(hpay "$D" 2026-07-01 1264.14)")" "ZM5MA"
check "unlinked entry left unchanged (no loan assigned)" "$($Q -c "select md5(to_jsonb(p)::text) from mortgage_payments p where property_id='$D' and mortgage_id is null")" "$UNL"
check "unlinked entry on another property not counted" "$(st "$(hpay "$D" 2026-07-02 1264.14)")" "OK"
check "older-page-style plain insert (no override column) refused against history -> ZM5MA" "$(st "insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$D','2026-07-02',1264.14,464.14,800)")" "ZM5MA"
# cross-table race: normal and history insert for the same payment at once -> exactly one succeeds unconfirmed
R=$(mk 2026-09-30)
( $Q -c "$AS begin; $(npay "$R" 2026-09-15 1264.14); select pg_sleep(2); commit;" >/dev/null 2>"$WORK/a.err" ) &
sleep 0.7; $Q -c "$AS $(hpay "$R" 2026-09-15 1264.14)" >/dev/null 2>"$WORK/b.err"; wait
check "cross-table race: normal committed, history refused ZM5MA" "$($Q -c "select (select count(*) from mortgage_payments where property_id='$R')||'/'||(select count(*) from mortgage_history_payments where property_id='$R')")/$(grep -c 'identical entry' "$WORK/b.err")" "1/0/1"

echo "== T1-5 voids and immutability"
V=$(mk 2026-09-01); VL=$(loan "$V")
st "$(hpay "$V" 2026-08-01 1264.14)" >/dev/null; st "$(hesc "$V" 2026-08-01 deposit 300)" >/dev/null
$Q -c "update mortgage_details set voided = true, voided_at = now() where id='$VL'; insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, interest_rate, monthly_payment, loan_start_date, term_years) values ('$ACC','$V','ZMR-TEST Refi Bank',100000,95000,5,700,'2026-09-15',30)" >/dev/null
FPV1=$(loanfp "$VL"); FPV2=$(loanfp "$(loan "$V")")
check "void after the loan was voided and replaced -> allowed" "$(st "update mortgage_history_payments set voided = true, void_reason = 'wrong' where property_id='$V'")" "OK"
check "...neither loan changed" "$(loanfp "$VL")/$(loanfp "$(loan "$V")")" "$FPV1/$FPV2"
check "voided_at set automatically" "$($Q -c "select voided_at is not null from mortgage_history_payments where property_id='$V'")" "t"
check "un-void refused" "$(st "update mortgage_history_payments set voided = false where property_id='$V'")" "ZM5M2"
check "changing an amount refused" "$(st "update mortgage_history_escrow set amount = 301 where property_id='$V'")" "ZM5M2"
check "changing declared_as_of refused" "$(st "update mortgage_history_escrow set declared_as_of = '2026-01-01' where property_id='$V'")" "ZM5M2"
check "void details can't be set without voiding" "$(st "update mortgage_history_escrow set void_reason = 'x' where property_id='$V'")" "ZM5M2"
check "normal entry: override count immutable" "$(st "update mortgage_payments set duplicate_ack_matches = 5 where property_id='$D' and duplicate_ack_matches is not null")" "ZM5M2"

echo "== T1-6 audit"
check "history inserts and voids are audited under their own table names" "$($Q -c "select count(distinct table_name) from audit_log where table_name in ('mortgage_history_payments','mortgage_history_escrow')")/$($Q -c "select count(*) from audit_log where table_name='mortgage_history_payments' and field_name='voided' and new_value='true'")" "2/$($Q -c "select count(*) from mortgage_history_payments where voided")"
check "audit captures declared_as_of and the override count" "$($Q -c "select count(distinct field_name) from audit_log where table_name='mortgage_history_payments' and field_name in ('declared_as_of','duplicate_ack_matches')")" "2"

echo "== Recovery draft: disable new history inserts; existing rows, duplicate rule and voids kept"
HROWS=$($Q -c "select count(*) || '/' || md5(string_agg(to_jsonb(h)::text, ',' order by h.id)) from mortgage_history_payments h")
$Q -v ON_ERROR_STOP=1 -f "$REPO/supabase/recovery/mortgage_history/disable_draft.sql" >/dev/null
check "disabled: a new history insert is refused" "$(st "$(hpay "$P" 2026-08-05 1111)")" "ZM5MC"
check "disabled: existing history rows kept byte-identical" "$($Q -c "select count(*) || '/' || md5(string_agg(to_jsonb(h)::text, ',' order by h.id)) from mortgage_history_payments h")" "$HROWS"
check "disabled: normal insert still checked against history rows (duplicate rule on)" "$(st "$(npay "$P" 2026-09-01 1001)")" "ZM5MA"
check "disabled: an existing history row can still be voided" "$(st "update mortgage_history_escrow set voided = true where property_id='$P' and transaction_type='deposit'")" "OK"

echo; echo "== $PASS passed, $FAIL failed"; [ $FAIL = 0 ]
