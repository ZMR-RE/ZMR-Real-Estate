#!/bin/bash
# Recovery drafts for 20261004100000 (supabase/recovery/mortgage_integrity/*_draft.sql): applies all migrations, records
# activity, applies the DRAFT disable forward migration, records more activity, then the DRAFT enable. Checks the defined
# states: objects/data/audit triggers retained while disabled; pre-integrity write behaviour while disabled; integrity
# behaviour back after enable; entries recorded while disabled behave as unlinked legacy entries on void.
# Disposable local Postgres; fictional data; never touches Practice or production.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../../.." && pwd)
PORT=${ZMR_MI_PGPORT:-55475}; PG=/opt/homebrew/opt/postgresql@17/bin
WORK=$(mktemp -d /tmp/zmr-mortgage-recovery.XXXXXX)
cleanup() { $PG/pg_ctl -D "$WORK/data" stop -m fast >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "port $PORT busy"; exit 2; fi
$PG/initdb -D "$WORK/data" -U postgres --auth=trust >/dev/null || exit 2
$PG/pg_ctl -D "$WORK/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$WORK/pg.log" start >/dev/null || exit 2; sleep 1
Q="$PG/psql -h 127.0.0.1 -p $PORT -U postgres -X -q -t -A -d zmr"
$PG/psql -h 127.0.0.1 -p $PORT -U postgres -X -q -d postgres -c "create database zmr" >/dev/null
$Q -v ON_ERROR_STOP=1 -f "$REPO/supabase/tests/entity_responsibility/bootstrap.sql" >/dev/null || exit 2
for f in "$REPO"/supabase/migrations/*.sql; do $Q -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>"$WORK/err" || { echo "FAILED: $f"; cat "$WORK/err"; exit 2; }; done

ACC=d0000000-0000-0000-0000-00000000000d; USR=dddddddd-0000-0000-0000-00000000000d; P=d1000000-0000-0000-0000-000000000001
AS="set role authenticated; set request.jwt.claim.sub='$USR';"
$Q -v ON_ERROR_STOP=1 >/dev/null <<SQL || exit 2
insert into auth.users (id, email) values ('$USR','zmr-test-d@example.test');
insert into accounts (id, name) values ('$ACC','ZMR-TEST D');
insert into account_members (account_id, user_id, role) values ('$ACC','$USR','owner');
insert into properties (id, account_id, address) values ('$P','$ACC','ZMR-TEST Recovery St');
insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, escrow_balance, interest_rate, monthly_payment, loan_start_date, term_years)
  values ('$ACC','$P','ZMR-TEST Bank',200000,1000,100,6.5,1500,'2022-01-01',30);
update mortgage_details set principal_figure_at = now() - interval '30 days', escrow_figure_at = now() - interval '30 days';
SQL
L=$($Q -c "select id from mortgage_details where property_id='$P'")
pay() { $Q -c "$AS insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$P',current_date,$(( $1 + 10 )),$1,10) returning id" | tail -1; }
bal() { $Q -c "select current_balance from mortgage_details where id='$L'"; }
FAIL=0; r() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  [expected '$3' got '$2']"; FAIL=1; fi; }

E1=$(pay 100)
counts() { $Q -c "select (select count(*) from mortgage_balance_effects)||'/'||(select count(*) from mortgage_balance_review_causes)||'/'||(select count(*) from information_schema.columns where table_name='mortgage_payments' and column_name in ('mortgage_id','void_outcome'))"; }
C0=$(counts)
$Q -v ON_ERROR_STOP=1 -f "$REPO/supabase/recovery/mortgage_integrity/disable_draft.sql" >/dev/null || { echo "disable draft failed"; exit 1; }
r "disable: effects/causes/columns retained" "$(counts)" "$C0"
r "disable: activity audit triggers kept" "$($Q -c "select count(*) from pg_trigger where tgname in ('mortgage_payments_audit_log','mortgage_escrow_transactions_audit_log')")" "2"
r "disable: integrity functions retained (re-enable needs them)" "$($Q -c "select count(*) from pg_proc where proname in ('void_mortgage_activity','reset_mortgage_balance','mortgage_void_core','mortgage_activity_guard')")" "4"
E2=$(pay 50)
r "disable: pre-integrity write behaviour (applied, not linked)" "$(bal $L) $($Q -c "select mortgage_id is null from mortgage_payments where id='$E2'")" "850.00 t"
r "disable: older-page balance edit possible again (pre-integrity)" "$($Q -c "$AS update mortgage_details set lender_name = lender_name, current_balance = current_balance where id='$L'" >/dev/null 2>&1 && echo OK)" "OK"

$Q -v ON_ERROR_STOP=1 -f "$REPO/supabase/recovery/mortgage_integrity/enable_draft.sql" >/dev/null || { echo "enable draft failed"; exit 1; }
E3=$(pay 25)
r "enable: new entries linked and applied again" "$(bal $L) $($Q -c "select mortgage_id = '$L' from mortgage_payments where id='$E3'")" "825.00 t"
r "enable: older-page balance change refused again" "$($Q -c "$AS update mortgage_details set current_balance = 1 where id='$L'" 2>&1 | grep -o 'out of date' | head -1)" "out of date"
r "enable: entry recorded while disabled voids as unlinked legacy (no reversal, review cause)" "$($Q -c "$AS select void_mortgage_activity('payment','$E2')->>'outcome'" | tail -1) $(bal $L)" "skipped_unlinked_legacy 825.00"
r "enable: entry recorded before the disable still reverses exactly" "$($Q -c "$AS select void_mortgage_activity('payment','$E1')->>'outcome'" | tail -1) $(bal $L)" "reversed 925.00"
r "recovery README forbids marking the migration reverted" "$(grep -c 'Never.*repair --status reverted' "$REPO/supabase/recovery/mortgage_integrity/README.md")" "1"
exit $FAIL
