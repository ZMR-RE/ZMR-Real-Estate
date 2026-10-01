#!/bin/bash
# Mortgage balance integrity (20261004100000) — focused database tests on a disposable local Postgres 17.
#
#   ./run.sh                 candidate: all repo migrations (incl. 20261004100000); every case must PASS
#   ./run.sh --control       same cases after the DRAFT disable forward migration (supabase/recovery/…/disable_draft.sql):
#                            proves the suite detects the defects (expected: FAILs, exit 1)
#
# Concurrency cases reuse T3's method and case definitions (docs/planning/mortgage/evidence/
# t3-mortgage-concurrency-2026-10-01/run.sh): session A holds its transaction 2 s, session B starts 0.7 s later;
# both run as role `authenticated` with a fictional owner JWT, as PostgREST does. T3's original script stays the
# untouched negative control on live code.
#
# Fictional data only. Never connects to Practice or production. Everything is deleted on exit.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
MODE=${1:-candidate}
PORT=${ZMR_MI_PGPORT:-55471}
PG=/opt/homebrew/opt/postgresql@17/bin
WORK=$(mktemp -d /tmp/zmr-mortgage-integrity.XXXXXX)
cleanup() { $PG/pg_ctl -D "$WORK/data" stop -m fast >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "port $PORT busy; set ZMR_MI_PGPORT"; exit 2; fi

$PG/initdb -D "$WORK/data" -U postgres --auth=trust >/dev/null || exit 2
$PG/pg_ctl -D "$WORK/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1 -c deadlock_timeout=200ms" -l "$WORK/pg.log" start >/dev/null || exit 2
sleep 1
PSQL="$PG/psql -h 127.0.0.1 -p $PORT -U postgres -X -q -t -A"
$PSQL -d postgres -c "create database zmr" >/dev/null
$PSQL -d zmr -v ON_ERROR_STOP=1 -f "$REPO/supabase/tests/entity_responsibility/bootstrap.sql" >/dev/null || exit 2
for f in "$REPO"/supabase/migrations/*.sql; do
  $PSQL -d zmr -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>"$WORK/err" || { echo "FAILED: $f"; cat "$WORK/err"; exit 2; }
done
if [ "$MODE" = --control ]; then
  $PSQL -d zmr -v ON_ERROR_STOP=1 -f "$REPO/supabase/recovery/mortgage_integrity/disable_draft.sql" >/dev/null || exit 2
  echo "== CONTROL: draft disable forward migration applied (pre-integrity triggers); defects expected"
fi
echo "== mode: $MODE   repo HEAD: $(git -C "$REPO" rev-parse --short HEAD)   migrations: $(ls "$REPO"/supabase/migrations/*.sql | wc -l | tr -d ' ')   $(date -u +%FT%TZ)"

Q="$PSQL -d zmr"
ACC=a0000000-0000-0000-0000-00000000000a; USR=aaaaaaaa-0000-0000-0000-00000000000a
ACC2=b0000000-0000-0000-0000-00000000000b; USR2=bbbbbbbb-0000-0000-0000-00000000000b
AS="set role authenticated; set request.jwt.claim.sub='$USR';"
AS2="set role authenticated; set request.jwt.claim.sub='$USR2';"
$Q -c "insert into auth.users (id, email) values ('$USR','zmr-test-a@example.test'),('$USR2','zmr-test-b@example.test');
insert into accounts (id, name) values ('$ACC','ZMR-TEST A'),('$ACC2','ZMR-TEST B');
insert into account_members (account_id, user_id, role) values ('$ACC','$USR','owner'),('$ACC2','$USR2','owner');" >/dev/null

PASS=0; FAIL=0
ok()  { echo "PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "FAIL  $1   [$2]"; FAIL=$((FAIL+1)); }
check() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected '$3' got '$2'"; fi; }

mk() {  # principal escrow [original]  -> property id (one active loan); ids from the database (mk runs in a subshell)
  local p; p=$($Q -c "select gen_random_uuid()")
  $Q -c "insert into properties (id, account_id, address) values ('$p','$ACC','ZMR-TEST Integrity St ${p:0:8}');
  insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, escrow_balance, interest_rate, monthly_payment, loan_start_date, term_years)
  values ('$ACC','$p','ZMR-TEST Bank',${3:-200000},$1,$2,6.5,1500,'2022-01-01',30);
  update mortgage_details set principal_figure_at = now() - interval '30 days', escrow_figure_at = now() - interval '30 days' where property_id = '$p';" >/dev/null
  echo "$p"
}
loan()  { $Q -c "select id from mortgage_details where property_id='$1' and not voided"; }
bal()   { $Q -c "select current_balance || '/' || coalesce(escrow_balance::text,'null') from mortgage_details where id='$1'"; }
ver()   { $Q -c "select principal_version from mortgage_details where id='$1'"; }
ever()  { $Q -c "select escrow_version from mortgage_details where id='$1'"; }
pay()   { echo "insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$1',${3:-current_date},$(( $2 + 10 )),$2,10)"; }
esc()   { echo "insert into mortgage_escrow_transactions (account_id, property_id, transaction_date, transaction_type, amount) values ('$ACC','$1',${4:-current_date},'$2',$3)"; }
newpay(){ $Q -c "$AS $(pay "$1" "$2" "${3:-current_date}") returning id" | tail -1; }
newesc(){ $Q -c "$AS $(esc "$1" "$2" "$3" "${4:-current_date}") returning id" | tail -1; }
# run SQL as the owner; print OK or the SQLSTATE
st() { $Q -c "$AS do \$x\$ begin $1; raise notice 'R:OK'; exception when others then raise notice 'R:%', sqlstate; end \$x\$;" 2>&1 | grep -o 'R:[A-Z0-9]*' | cut -d: -f2; }
vrpc() { $Q -c "$AS select void_mortgage_activity('$1','$2')->>'outcome'" | tail -1; }
# reset_p loan expected_principal_version value [cause-ids-array] ; reset_e loan expected_escrow_version value [ids]
reset_p() { $Q -c "$AS select reset_mortgage_balance('$1', $3, $2, null, null, null, ${4:-'{}'}::uuid[])" >/dev/null 2>&1 && echo OK || echo ERR; }
reset_e() { $Q -c "$AS select reset_mortgage_balance('$1', null, null, $3, $2, null, ${4:-'{}'}::uuid[])" >/dev/null 2>&1 && echo OK || echo ERR; }
openids() { echo "array(select id from mortgage_balance_review_causes where review_mortgage_id='$1' and resolved_at is null and balance_kind='$2')"; }
race() {
  ( $Q -c "$AS begin; $1; select pg_sleep(2); commit;" >/dev/null 2>"$WORK/a.err" ) &
  sleep 0.7
  $Q -c "$AS $2" >/dev/null 2>"$WORK/b.err"
  wait
}
causes() { local k=${2:-}; $Q -c "select count(*) from mortgage_balance_review_causes where review_mortgage_id='$1' and resolved_at is null ${k:+and balance_kind='$k'}"; }

echo "-- Concurrency (T3 C1–C7 method)"
P=$(mk 1000 100); L=$(loan $P); race "$(pay $P 100)" "$(pay $P 50)";            check "R1 payment 100 || 50 -> 850"                 "$(bal $L)" "850.00/100.00"
P=$(mk 1000 100); L=$(loan $P); race "$(esc $P deposit 30)" "$(esc $P deposit 20)"; check "R2 deposit 30 || 20 -> escrow 150"        "$(bal $L)" "1000.00/150.00"
P=$(mk 1000 100); L=$(loan $P); race "$(esc $P disbursement 80)" "$(esc $P disbursement 80)"
check "R3 disbursement 80 || 80 -> second refused" "$(bal $L) rows=$($Q -c "select count(*) from mortgage_escrow_transactions where property_id='$P'")" "1000.00/20.00 rows=1"
P=$(mk 100 100); L=$(loan $P); race "$(pay $P 80)" "$(pay $P 80)"
check "R4 principal 80 || 80 on 100 -> second refused" "$(bal $L) rows=$($Q -c "select count(*) from mortgage_payments where property_id='$P'")" "20.00/100.00 rows=1"
P=$(mk 1000 100); L=$(loan $P); race "$(pay $P 100)" "$(esc $P deposit 30)";     check "R5 payment || deposit (columns independent)" "$(bal $L)" "900.00/130.00"
P=$(mk 1000 100); L=$(loan $P); V=$(ver $L)
race "select reset_mortgage_balance('$L', 2000, $V)" "$(pay $P 50 "current_date + 1")"; check "R6 reset to 2000 || then payment 50 (dated after it) -> 1950"  "$(bal $L)" "1950.00/100.00"
P=$(mk 1000 100); L=$(loan $P); V=$(ver $L)
race "select reset_mortgage_balance('$L', 2000, $V)" "$(pay $P 50)"
check "R6b reset today || payment dated today -> applied and flagged (the new figure may include it)" "$(bal $L) $(causes $L principal)" "1950.00/100.00 1"
P=$(mk 1000 100); L=$(loan $P); V=$(ver $L)
race "$(pay $P 100)" "select reset_mortgage_balance('$L', 2000, $V)"
check "R7 payment || then STALE reset -> reset refused, 900" "$(bal $L) $(grep -o 'changed since you opened' "$WORK/b.err" | head -1)" "900.00/100.00 changed since you opened"
P=$(mk 1000 100); L=$(loan $P); race "$(pay $P 100)" "update mortgage_details set current_balance = 2000 where id = '$L'"
check "R8 old-browser balance edit (C6/C7 path) refused, payment kept" "$(bal $L) $(grep -o 'out of date' "$WORK/b.err" | head -1)" "900.00/100.00 out of date"
P=$(mk 1000 100); L=$(loan $P); E=$(newpay $P 100)
race "select void_mortgage_activity('payment','$E')" "select void_mortgage_activity('payment','$E')"
check "R9 concurrent double void -> reversed once" "$(bal $L) $($Q -c "select count(*) from mortgage_balance_effects where source_id='$E' and effect='reversed'")" "1000.00/100.00 1"
P=$(mk 1000 100); L=$(loan $P); E=$(newpay $P 100)
race "select void_mortgage_activity('payment','$E')" "$(pay $P 50)";              check "R10 void || new payment -> 950"              "$(bal $L)" "950.00/100.00"
P=$(mk 1000 100); L=$(loan $P); E=$(newpay $P 100)
race "update mortgage_payments set voided = true, voided_at = now() where id = '$E'" "select void_mortgage_activity('payment','$E')"
check "R11 older-page void || current void of same entry -> exactly one reversal" "$(bal $L) $($Q -c "select count(*) from mortgage_balance_effects where source_id='$E' and effect='reversed'")" "1000.00/100.00 1"

P=$(mk 1000 100); L=$(loan $P); E=$(newpay $P 100)
# M8: force the one documented cycle — an older page holds the entry and wants the loan; the current app holds the loan and wants the entry
( $Q -c "$AS begin; select 1 from mortgage_payments where id='$E' for update; select pg_sleep(1); update mortgage_payments set voided = true where id = '$E'; commit;" >/dev/null 2>"$WORK/a.err" ) &
sleep 0.4
$Q -c "$AS begin; select 1 from mortgage_details where id='$L' for update; select pg_sleep(1); select void_mortgage_activity('payment','$E'); commit;" >/dev/null 2>"$WORK/b.err"
wait
check "R12 forced deadlock: Postgres aborts one side (40P01), the other completes exactly once" "$(cat "$WORK/a.err" "$WORK/b.err" | grep -c 'deadlock detected') $(bal $L) $($Q -c "select count(*) from mortgage_balance_effects where source_id='$E' and effect='reversed'") $($Q -c "select voided from mortgage_payments where id='$E'")" "1 1000.00/100.00 1 t"

echo "-- Linkage, immutability, one-way void"
P=$(mk 1000 100); L=$(loan $P); E=$(newpay $P 100)
check "F1 new entry linked server-side to the active loan" "$($Q -c "select mortgage_id from mortgage_payments where id='$E'")" "$L"
check "F1b client-supplied wrong mortgage_id refused" "$(st "insert into mortgage_payments (account_id, property_id, mortgage_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$P', gen_random_uuid(), '2026-10-01', 20, 10, 10)")" "ZM5M1"
check "F2 current void reverses exactly" "$(vrpc payment $E) $(bal $L)" "reversed 1000.00/100.00"
check "F2b repeated void is a no-op" "$(vrpc payment $E) $(bal $L)" "already_voided 1000.00/100.00"
check "F3 un-void refused" "$(st "update mortgage_payments set voided = false where id = '$E'")" "ZM5M2"
E2=$(newpay $P 40)
check "F4 fact edit refused" "$(st "update mortgage_payments set principal_amount = 1 where id = '$E2'")" "ZM5M2"
check "F4b delete refused" "$(st "delete from mortgage_payments where id = '$E2'")" "ZM5M2"
check "F5 older-page void (plain UPDATE) runs the conditional core: reversed" "$(st "update mortgage_payments set voided = true, voided_at = now() where id = '$E2'") $($Q -c "select void_outcome from mortgage_payments where id='$E2'") $(bal $L)" "OK reversed 1000.00/100.00"
check "F5b client can't set void details without voiding" "$(st "update mortgage_payments set void_outcome = 'reversed' where id = '$(newpay $P 5)'")" "ZM5M2"

echo "-- Resets (separate principal/escrow epochs; same-value; stale; old browsers)"
P=$(mk 1000 100); L=$(loan $P); EP=$(newpay $P 100); ED=$(newesc $P deposit 30)
check "F6 principal reset" "$(reset_p $L $(ver $L) 950)" "OK"
check "F6b void payment after principal reset -> skipped, balance unchanged" "$(vrpc payment $EP) $(bal $L)" "skipped_reset_after_entry 950.00/130.00"
check "F6c ...creates one principal review cause" "$(causes $L principal)" "1"
check "F6d escrow unaffected by principal reset: deposit void reverses" "$(vrpc escrow $ED) $(bal $L)" "reversed 950.00/100.00"
P=$(mk 1000 100); L=$(loan $P); EP=$(newpay $P 100)
check "F7 same-value reset (deliberate confirmation) accepted" "$(reset_p $L $(ver $L) 900)" "OK"
check "F7b ...counts as a reset: later void skips" "$(vrpc payment $EP) $(bal $L)" "skipped_reset_after_entry 900.00/100.00"
P=$(mk 1000 100); L=$(loan $P); V=$(ver $L); newpay $P 100 >/dev/null
check "F8 stale form (version moved) refused, nothing saved" "$(reset_p $L $V 1000) $(bal $L)" "ERR 900.00/100.00"
check "F8b old-browser changed balance refused (ZM5M6)" "$(st "update mortgage_details set escrow_balance = 0 where id = '$L'")" "ZM5M6"
check "F8c old-browser unchanged resend + other edit allowed, not a reset" "$(st "update mortgage_details set lender_name = 'ZMR-TEST Renamed', current_balance = 900, escrow_balance = 100 where id = '$L'") $($Q -c "select principal_epoch||'/'||escrow_epoch from mortgage_details where id='$L'")" "OK 0/0"
check "F8d counters can't be set directly" "$(st "update mortgage_details set principal_epoch = 7 where id = '$L'")" "ZM5M6"

echo "-- Inactive/replaced loan (frozen, no review cause)"
P=$(mk 1000 100); A=$(loan $P); EP=$(newpay $P 100)
$Q -c "update mortgage_details set voided = true, voided_at = now() where id='$A'" >/dev/null
$Q -c "insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, escrow_balance, interest_rate, monthly_payment, loan_start_date, term_years) values ('$ACC','$P','ZMR-TEST Replacement',500,500,0,5,100,'2026-10-01',15)" >/dev/null
B=$(loan $P)
check "F9 void on replaced loan: A frozen, B untouched" "$(vrpc payment $EP) A=$(bal $A) B=$(bal $B)" "skipped_loan_inactive A=900.00/100.00 B=500.00/0.00"
check "F9b no review cause for an inactive loan" "$(causes $A) $(causes $B)" "0 0"
check "F9c reset on inactive loan refused" "$(reset_p $A $(ver $A) 1)" "ERR"

echo "-- Unlinked legacy entries"
P=$(mk 1000 100); L=$(loan $P)
LG=$($Q -c "set session_replication_role = replica; insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$P','2026-09-15',1500,444,1056) returning id;" | tail -1)
check "F10 legacy void: flag only, balance unchanged" "$(vrpc payment $LG) $(bal $L) $($Q -c "select mortgage_id is null from mortgage_payments where id='$LG'")" "skipped_unlinked_legacy 1000.00/100.00 t"
check "F10b ...principal review cause on the active loan" "$(causes $L principal)" "1"

echo "-- Escrow refusals and order"
P=$(mk 1000 100); L=$(loan $P); ED=$(newesc $P deposit 50); EB=$(newesc $P disbursement 140)
check "F11 void deposit used by a later disbursement -> refused, not voided" "$(vrpc escrow $ED) $($Q -c "select voided from mortgage_escrow_transactions where id='$ED'") $(bal $L)" "refused_negative_escrow f 1000.00/10.00"
check "F11b ...refusal and escrow review cause committed together" "$(causes $L escrow) $($Q -c "select count(*) from mortgage_balance_effects where source_id='$ED' and effect='void_refused'")" "1 1"
check "F11c older-page same void -> ZM5M3 raised, nothing recorded" "$(st "update mortgage_escrow_transactions set voided = true where id = '$ED'") $($Q -c "select count(*) from mortgage_balance_effects where source_id='$ED' and effect='void_refused'")" "ZM5M3 1"
check "F11d repeated refused void is idempotent (one refusal effect, one open cause)" "$(vrpc escrow $ED) $($Q -c "select count(*) from mortgage_balance_effects where source_id='$ED' and effect='void_refused'") $(causes $L escrow)" "refused_negative_escrow 1 1"
check "F12 void disbursement then deposit -> both reverse" "$(vrpc escrow $EB) $(vrpc escrow $ED) $(bal $L)" "reversed reversed 1000.00/100.00"
check "F12b the successful void closes the earlier refusal cause" "$(causes $L escrow)" "0"

echo "-- Over-original refusal (owner choice 3)"
P=$(mk 1050 0 1000); L=$(loan $P); EP=$(newpay $P 100)
check "F13 void raising balance above original -> refused, review cause" "$(vrpc payment $EP) $(bal $L) $(causes $L principal)" "refused_over_original 950.00/0.00 1"
check "F13b older-page same void -> ZM5M4" "$(st "update mortgage_payments set voided = true where id = '$EP'")" "ZM5M4"

echo "-- Review resolution is per balance"
P=$(mk 1000 100); L=$(loan $P); EP=$(newpay $P 100); ED=$(newesc $P deposit 20)
reset_p $L $(ver $L) 900 >/dev/null; reset_e $L $(ever $L) 120 >/dev/null
vrpc payment $EP >/dev/null; vrpc escrow $ED >/dev/null
check "F14 two open causes (principal + escrow)" "$(causes $L principal)/$(causes $L escrow)" "1/1"
reset_p $L $(ver $L) 900 >/dev/null
check "F14a a reset that names no causes resolves none (M2)" "$(causes $L principal)/$(causes $L escrow)" "1/1"
SEEN=$($Q -c "select '{' || string_agg(id::text, ',') || '}' from mortgage_balance_review_causes where review_mortgage_id='$L' and resolved_at is null and balance_kind='principal'")
EP2=$(newpay $P 30 "current_date + 1"); reset_p $L $(ver $L) 870 >/dev/null; vrpc payment $EP2 >/dev/null
check "F14b a cause raised during review (after the user looked) exists" "$(causes $L principal)" "2"
reset_p $L $(ver $L) 870 "'$SEEN'" >/dev/null
check "F14c confirming resolves only the causes shown; the new one and escrow stay open" "$(causes $L principal)/$(causes $L escrow)" "1/1"
check "F14d escrow cause can't be resolved through a principal reset" "$(reset_p $L $(ver $L) 870 "array(select id from mortgage_balance_review_causes where review_mortgage_id='$L' and resolved_at is null and balance_kind='escrow')") $(causes $L escrow)" "OK 1"

echo "-- Permissions and audit"
check "F15 clients can't write effects" "$(st "insert into mortgage_balance_effects (account_id, property_id, source_kind, source_id, effect) values ('$ACC','$P','reset',gen_random_uuid(),'reset')")" "42501"
check "F15b clients can't write review causes" "$(st "update mortgage_balance_review_causes set resolved_at = now()")" "42501"
check "F15c another workspace sees none of A's effects" "$($Q -c "$AS2 select count(*) from mortgage_balance_effects" | tail -1)" "0"
check "F15d another workspace can't void A's entry" "$($Q -c "$AS2 select void_mortgage_activity('payment','$EP')" 2>&1 | grep -o 'not found' | head -1)" "not found"
check "F16 audit rows for a void" "$($Q -c "select count(*) > 0 from audit_log where table_name='mortgage_payments' and record_id='$EP'")" "t"
check "F16b audit rows for a reset" "$($Q -c "select count(*) > 0 from audit_log where table_name='mortgage_details' and record_id='$L' and field_name='current_balance'")" "t"


echo "-- Historical entries (B4): applied as today, flagged when dated on/before the latest statement/figure date"
P=$(mk 1000 100); L=$(loan $P)
H=$(newpay $P 100 "current_date - 40")
check "H1 entry dated before the figure was entered: applied AND flagged" "$(bal $L) $(causes $L principal) $($Q -c "select cause from mortgage_balance_review_causes where source_id='$H'")" "900.00/100.00 1 possibly_covered_by_statement"
check "H1b the flag carries the entry and balance-update context" "$($Q -c "select (context ? 'entry_date') and (context ? 'principal') and (context ? 'balance_updated_at') from mortgage_balance_review_causes where source_id='$H'")" "t"
A=$(newpay $P 10)
check "H2 an entry dated after the figure date is applied, not flagged" "$(bal $L) $($Q -c "select count(*) from mortgage_balance_review_causes where source_id='$A'")" "890.00/100.00 0"
P=$(mk 1000 100); L=$(loan $P)
$Q -c "$AS select reset_mortgage_balance('$L', 1000, 0, null, null, current_date - 5)" >/dev/null
$Q -c "update mortgage_details set principal_figure_at = now() - interval '10 days' where id = '$L'" >/dev/null
H5=$(newpay $P 10 "current_date - 6"); A5=$(newpay $P 10 "current_date - 3")
check "H3 statement date known: dated on/before it -> flagged; after it -> not" "$($Q -c "select count(*) from mortgage_balance_review_causes where source_id='$H5'")/$($Q -c "select count(*) from mortgage_balance_review_causes where source_id='$A5'") $(bal $L)" "1/0 980.00/100.00"
check "H3b the statement date is stored as given" "$($Q -c "select principal_as_of = current_date - 5 from mortgage_details where id='$L'")" "t"
check "H4 confirming the balance with the shown ids resolves the flag" "$(reset_p $L $(ver $L) 980 "$(openids $L principal)") $(causes $L principal)" "OK 0"
check "H4b a reset without a statement date leaves it unknown (not defaulted)" "$($Q -c "select coalesce(principal_as_of::text,'unknown') from mortgage_details where id='$L'")" "unknown"
P=$(mk 1000 100); L=$(loan $P); HV=$(newpay $P 50 "current_date - 40")
check "H5 voiding a flagged entry reverses it and closes its flag" "$(vrpc payment $HV) $(bal $L) $(causes $L principal)" "reversed 1000.00/100.00 0"
P=$(mk 1000 100); L=$(loan $P); HE=$(newesc $P deposit 40 "current_date - 45")
check "H6 escrow: flagged on the escrow balance only" "$(bal $L) $(causes $L escrow)/$(causes $L principal)" "1000.00/140.00 1/0"
check "H7 future statement date refused" "$($Q -c "$AS select reset_mortgage_balance('$L', null, null, 140, $(ever $L), current_date + 1)" 2>&1 | grep -o 'future' | head -1)" "future"

echo "-- Review context (B3)"
P=$(mk 1000 100); L=$(loan $P); EP=$(newpay $P 50); reset_p $L $(ver $L) 950 >/dev/null; vrpc payment $EP >/dev/null
check "B3 reset-skip cause records entry date/type/principal and when the balance was updated" "$($Q -c "select context->>'entry_type' || '|' || (context->>'principal') || '|' || ((context->>'balance_updated_at') is not null)::text from mortgage_balance_review_causes where source_id='$EP'")" "payment|50.00|true"
P=$(mk 1050 0 1000); L=$(loan $P); EP=$(newpay $P 100); vrpc payment $EP >/dev/null
check "B3b refused cause: entry still active (not voided) with its context" "$($Q -c "select voided from mortgage_payments where id='$EP'") $($Q -c "select context->>'principal' from mortgage_balance_review_causes where source_id='$EP'")" "f 100.00"

echo "-- Versions"
P=$(mk 1000 100); L=$(loan $P); E=$(newpay $P 10)
V1=$(ver $L); vrpc payment $E >/dev/null; V2=$(ver $L); reset_p $L $V2 990 >/dev/null; V3=$(ver $L)
check "V1 principal version bumps on apply, reversal and reset" "$V1 $V2 $V3" "1 2 3"
race "select reset_mortgage_balance('$L', 980, $V3)" "select reset_mortgage_balance('$L', 970, $V3)"
check "V2 two resets from the same version: first wins, second refused stale" "$(bal $L) $(grep -o 'changed since you opened' "$WORK/b.err" | head -1)" "980.00/100.00 changed since you opened"


echo "-- T3 M1/M2/M4/M7/M8 additions"
P=$(mk 1000 100); L=$(loan $P); PV=$(ver $L); newesc $P deposit 10 >/dev/null
check "M7 an escrow entry doesn't make a principal-only reset stale" "$(reset_p $L $PV 990)" "OK"
check "M7b ...but an escrow reset from the old escrow version is stale" "$(reset_e $L 0 50)" "ERR"
check "M1 a new loan's opening balances are recorded as an initial reset effect" "$($Q -c "select count(*) from mortgage_balance_effects where mortgage_id='$L' and effect='reset' and reason='opening' and principal_delta=1000")" "1"
P=$(mk 1000 100); L=$(loan $P)
LG=$($Q -c "set session_replication_role = replica; insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$P','2026-09-15',100,90,10) returning id;" | tail -1)
vrpc payment $LG >/dev/null
check "M2 legacy cause is NOT resolved by a principal confirmation" "$(reset_p $L $(ver $L) 1000 "$(openids $L principal)") $(causes $L principal)" "OK 1"
CID=$($Q -c "select id from mortgage_balance_review_causes where review_mortgage_id='$L' and resolved_at is null")
check "M2b ...only by explicit acknowledgement" "$($Q -c "$AS select acknowledge_mortgage_review_cause('$CID')" >/dev/null 2>&1 && echo OK) $(causes $L principal)" "OK 0"
check "M4 marking every action_items task complete can't hide a review cause" "$($Q -c "update action_items set completed = true" >/dev/null; causes $L)" "0"
P=$(mk 1000 100); L=$(loan $P); EP=$(newpay $P 50); reset_p $L $(ver $L) 950 >/dev/null; vrpc payment $EP >/dev/null
$Q -c "update action_items set completed = true" >/dev/null
check "M4b an open cause survives generic task completion" "$(causes $L principal)" "1"
P=$(mk 1000 100); L=$(loan $P)
LG=$($Q -c "set session_replication_role = replica; insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$P','2026-09-15',100,90,10) returning id;" | tail -1)
race "select reset_mortgage_balance('$L', 1000, $(ver $L))" "select void_mortgage_activity('payment','$LG')"
check "M8 a legacy void takes the active loan lock (waits for the reset, then records its cause)" "$(causes $L principal) $($Q -c "select voided from mortgage_payments where id='$LG'")" "1 t"

echo "-- Authorization and hardening of the controlled paths"
P=$(mk 1000 100); L=$(loan $P); E=$(newpay $P 10)
check "S1 another workspace can't reset" "$($Q -c "$AS2 select reset_mortgage_balance('$L', 1, $(ver $L))" 2>&1 | grep -o 'not found' | head -1)" "not found"
check "S1b another workspace can't acknowledge A's review" "$($Q -c "$AS2 select acknowledge_mortgage_review_cause(gen_random_uuid())" 2>&1 | grep -o 'not found' | head -1)" "not found"
check "S1c another workspace can't insert against A's loan" "$($Q -c "$AS2 insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$P',current_date,20,10,10)" 2>&1 | grep -o -E 'Not a member|row-level security' | head -1)" "Not a member"
check "S2 clients can't execute internal functions" "$(st "perform mortgage_void_core('payment', '{}'::jsonb, false)") $(st "perform mortgage_cause_context('payment', '{}'::jsonb, null::mortgage_details)")" "42501 42501"
check "S2b the loan guard runs with the caller's rights (not SECURITY DEFINER)" "$($Q -c "select prosecdef from pg_proc where proname='mortgage_details_balance_guard'")" "f"
check "S3 every SECURITY DEFINER mortgage function pins search_path" "$($Q -c "select count(*) from pg_proc where prosecdef and (proname like 'mortgage%' or proname in ('void_mortgage_activity','reset_mortgage_balance','acknowledge_mortgage_review_cause')) and not exists (select 1 from unnest(proconfig) c where c like 'search_path=%')")" "0"
check "S3b anon can execute none of the public functions" "$($Q -c "select count(*) from pg_proc where proname in ('void_mortgage_activity','reset_mortgage_balance','acknowledge_mortgage_review_cause') and has_function_privilege('anon', oid, 'execute')")" "0"
check "S4 audit check kept every earlier table name and added the two new ones" "$($Q -c "select count(*) from unnest(array['properties','llcs','mortgage_details','financial_transactions','financial_periods','contacts','contact_methods','contact_links','mortgage_payments','mortgage_escrow_transactions']) t where not exists (select 1 from pg_constraint where conname='audit_log_table_name_check' and pg_get_constraintdef(oid) like '%' || t || '%')")" "0"

echo "== RESULT ($MODE): $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
