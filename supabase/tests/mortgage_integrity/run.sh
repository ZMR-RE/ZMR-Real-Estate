#!/bin/bash
# Mortgage balance integrity (20261004100000) — focused database tests on a disposable local Postgres 17.
#
#   ./run.sh                 candidate: all repo migrations (incl. 20261004100000); every case must PASS
#   ./run.sh --control       same cases with the forward migration's triggers rolled back (rollback script):
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
  $PSQL -d zmr -v ON_ERROR_STOP=1 -f "$REPO/supabase/rollback/20261004100000_mortgage_balance_integrity_down.sql" >/dev/null || exit 2
  echo "== CONTROL: forward migration rolled back (old triggers); defects expected"
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
  values ('$ACC','$p','ZMR-TEST Bank',${3:-200000},$1,$2,6.5,1500,'2022-01-01',30);" >/dev/null
  echo "$p"
}
loan()  { $Q -c "select id from mortgage_details where property_id='$1' and not voided"; }
bal()   { $Q -c "select current_balance || '/' || coalesce(escrow_balance::text,'null') from mortgage_details where id='$1'"; }
ver()   { $Q -c "select balance_version from mortgage_details where id='$1'"; }
pay()   { echo "insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$1','2026-10-01',$(( $2 + 10 )),$2,10)"; }
esc()   { echo "insert into mortgage_escrow_transactions (account_id, property_id, transaction_date, transaction_type, amount) values ('$ACC','$1','2026-10-01','$2',$3)"; }
newpay(){ $Q -c "$AS $(pay $1 $2) returning id" | tail -1; }
newesc(){ $Q -c "$AS $(esc $1 $2 $3) returning id" | tail -1; }
# run SQL as the owner; print OK or the SQLSTATE
st() { $Q -c "$AS do \$x\$ begin $1; raise notice 'R:OK'; exception when others then raise notice 'R:%', sqlstate; end \$x\$;" 2>&1 | grep -o 'R:[A-Z0-9]*' | cut -d: -f2; }
vrpc() { $Q -c "$AS select void_mortgage_activity('$1','$2')->>'outcome'" | tail -1; }
reset_p() { $Q -c "$AS select reset_mortgage_balance('$1', $2, $3, null)" >/dev/null 2>&1 && echo OK || echo ERR; }
reset_e() { $Q -c "$AS select reset_mortgage_balance('$1', $2, null, $3)" >/dev/null 2>&1 && echo OK || echo ERR; }
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
race "select reset_mortgage_balance('$L', $V, 2000, null)" "$(pay $P 50)";        check "R6 reset to 2000 || then payment 50 -> 1950"  "$(bal $L)" "1950.00/100.00"
P=$(mk 1000 100); L=$(loan $P); V=$(ver $L)
race "$(pay $P 100)" "select reset_mortgage_balance('$L', $V, 2000, null)"
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
check "R11 old-browser void || current void of same entry -> one reversal" "$(bal $L) $($Q -c "select count(*) from mortgage_balance_effects where source_id='$E' and effect='reversed'")" "1000.00/100.00 1"

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
check "F5 old-browser void (plain UPDATE) reverses with outcome" "$(st "update mortgage_payments set voided = true, voided_at = now() where id = '$E2'") $($Q -c "select void_outcome from mortgage_payments where id='$E2'") $(bal $L)" "OK reversed 1000.00/100.00"
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
check "F11c old-browser same void -> ZM5M3, nothing recorded" "$(st "update mortgage_escrow_transactions set voided = true where id = '$ED'") $($Q -c "select count(*) from mortgage_balance_effects where source_id='$ED' and effect='void_refused'")" "ZM5M3 1"
check "F12 void disbursement then deposit -> both reverse" "$(vrpc escrow $EB) $(vrpc escrow $ED) $(bal $L)" "reversed reversed 1000.00/100.00"

echo "-- Over-original refusal (owner choice 3)"
P=$(mk 1050 0 1000); L=$(loan $P); EP=$(newpay $P 100)
check "F13 void raising balance above original -> refused, review cause" "$(vrpc payment $EP) $(bal $L) $(causes $L principal)" "refused_over_original 950.00/0.00 1"
check "F13b old-browser same void -> ZM5M4" "$(st "update mortgage_payments set voided = true where id = '$EP'")" "ZM5M4"

echo "-- Review resolution is per balance"
P=$(mk 1000 100); L=$(loan $P); EP=$(newpay $P 100); ED=$(newesc $P deposit 20)
reset_p $L $(ver $L) 900 >/dev/null; reset_e $L $(ver $L) 120 >/dev/null
vrpc payment $EP >/dev/null; vrpc escrow $ED >/dev/null
check "F14 two open causes (principal + escrow)" "$(causes $L principal)/$(causes $L escrow)" "1/1"
reset_p $L $(ver $L) 900 >/dev/null
check "F14b resolving principal leaves the escrow cause open" "$(causes $L principal)/$(causes $L escrow)" "0/1"

echo "-- Permissions and audit"
check "F15 clients can't write effects" "$(st "insert into mortgage_balance_effects (account_id, property_id, source_kind, source_id, effect) values ('$ACC','$P','reset',gen_random_uuid(),'reset')")" "42501"
check "F15b clients can't write review causes" "$(st "update mortgage_balance_review_causes set resolved_at = now()")" "42501"
check "F15c another workspace sees none of A's effects" "$($Q -c "$AS2 select count(*) from mortgage_balance_effects" | tail -1)" "0"
check "F15d another workspace can't void A's entry" "$($Q -c "$AS2 select void_mortgage_activity('payment','$EP')" 2>&1 | grep -o 'not found' | head -1)" "not found"
check "F16 audit rows for a void" "$($Q -c "select count(*) > 0 from audit_log where table_name='mortgage_payments' and record_id='$EP'")" "t"
check "F16b audit rows for a reset" "$($Q -c "select count(*) > 0 from audit_log where table_name='mortgage_details' and record_id='$L' and field_name='current_balance'")" "t"

echo "== RESULT ($MODE): $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
