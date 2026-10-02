#!/bin/bash
# Data preservation for 20261004100000: apply every earlier migration, seed fictional data shaped like production's
# 2169-Ash-St case (an earlier voided loan whose voided $1,500 payment / $800 deposit changed its balances, a second
# voided test loan, and a current active loan created later), snapshot, apply ONLY the new migration, compare.
# Expected: every pre-existing row and balance identical; legacy entries remain mortgage_id NULL; no effects or
# review causes are created for history. Fictional data; disposable Postgres; never touches Practice/production.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../../.." && pwd)
PORT=${ZMR_MI_PGPORT:-55472}; PG=/opt/homebrew/opt/postgresql@17/bin
NEW="$REPO/supabase/migrations/20261004100000_mortgage_balance_integrity.sql"
WORK=$(mktemp -d /tmp/zmr-mortgage-preserve.XXXXXX)
cleanup() { $PG/pg_ctl -D "$WORK/data" stop -m fast >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "port $PORT busy"; exit 2; fi
$PG/initdb -D "$WORK/data" -U postgres --auth=trust >/dev/null || exit 2
$PG/pg_ctl -D "$WORK/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$WORK/pg.log" start >/dev/null || exit 2; sleep 1
Q="$PG/psql -h 127.0.0.1 -p $PORT -U postgres -X -q -t -A -d zmr"
$PG/psql -h 127.0.0.1 -p $PORT -U postgres -X -q -d postgres -c "create database zmr" >/dev/null
$Q -v ON_ERROR_STOP=1 -f "$REPO/supabase/tests/entity_responsibility/bootstrap.sql" >/dev/null || exit 2
for f in "$REPO"/supabase/migrations/*.sql; do
  [ "$f" = "$NEW" ] && continue
  $Q -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>"$WORK/err" || { echo "FAILED: $f"; cat "$WORK/err"; exit 2; }
done
echo "== baseline: $(ls "$REPO"/supabase/migrations/*.sql | grep -vc 20261004100000) migrations (without 20261004100000)"

ACC=c0000000-0000-0000-0000-00000000000c; USR=cccccccc-0000-0000-0000-00000000000c
P=c1000000-0000-0000-0000-000000000001
AS="set role authenticated; set request.jwt.claim.sub='$USR';"
$Q -v ON_ERROR_STOP=1 >/dev/null <<SQL || exit 2
insert into auth.users (id, email) values ('$USR','zmr-test-c@example.test');
insert into accounts (id, name) values ('$ACC','ZMR-TEST C');
insert into account_members (account_id, user_id, role) values ('$ACC','$USR','owner');
insert into properties (id, account_id, address) values ('$P','$ACC','2169 ZMR-TEST Fixture St');
$AS
-- earlier loan (shape of Test Bank): entries applied through the OLD triggers, then voided, loan voided
insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, interest_rate, monthly_payment, loan_start_date, term_years)
  values ('$ACC','$P','ZMR-TEST Old Bank',200000,195000,6.5,1500,'2022-01-01',30);
insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount)
  values ('$ACC','$P','2026-09-15',1500,444,1056);
insert into mortgage_escrow_transactions (account_id, property_id, transaction_date, transaction_type, amount)
  values ('$ACC','$P','2026-09-15','deposit',800);
update mortgage_details set voided = true, voided_at = now() where property_id = '$P' and not voided;
update mortgage_escrow_transactions set voided = true, voided_at = now();
update mortgage_payments set voided = true, voided_at = now();
-- second voided test loan, no activity
insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, interest_rate, monthly_payment, loan_start_date, term_years)
  values ('$ACC','$P','ZMR-TEST-Verification',200000,150000,6.5,1200,'2022-01-01',30);
update mortgage_details set voided = true, voided_at = now() where property_id = '$P' and not voided;
-- current loan (shape of the Oct 1 loan)
insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, escrow_balance, interest_rate, monthly_payment, loan_start_date, term_years)
  values ('$ACC','$P','ZMR-TEST Current Bank',85000,42952.07,0.00,3.625,387.64,'2020-06-01',30);
SQL

snap() {
  $Q -c "select md5(string_agg(x, '|' order by x)) from (
    select 'L'||id||current_balance||coalesce(escrow_balance::text,'')||voided||original_loan_amount||coalesce(lender_name,'') x from mortgage_details
    union all select 'P'||id||amount||principal_amount||interest_amount||voided||coalesce(voided_at::text,'')||payment_date from mortgage_payments
    union all select 'E'||id||amount||transaction_type||voided||coalesce(voided_at::text,'')||transaction_date from mortgage_escrow_transactions
    union all select 'A'||count(*) from audit_log) s"
}
# simulate another migration having widened the audit check (e.g. a future invoices table): it must survive
$Q -c "alter table audit_log drop constraint audit_log_table_name_check; alter table audit_log add constraint audit_log_table_name_check check (table_name in ('properties','llcs','mortgage_details','financial_transactions','financial_periods','contacts','contact_methods','contact_links','zz_other_migration_table'))" >/dev/null
UPD=$($Q -c "select string_agg(updated_at::text, ' ' order by created_at) from mortgage_details")
BEFORE=$(snap); BAL=$($Q -c "select string_agg(lender_name||'='||current_balance||'/'||coalesce(escrow_balance::text,'null'), ' ' order by created_at) from mortgage_details")
$Q -v ON_ERROR_STOP=1 -f "$NEW" >/dev/null 2>"$WORK/err" || { echo "FAILED to apply new migration"; cat "$WORK/err"; exit 1; }
AFTER=$(snap); BAL2=$($Q -c "select string_agg(lender_name||'='||current_balance||'/'||coalesce(escrow_balance::text,'null'), ' ' order by created_at) from mortgage_details")
FAIL=0
r() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  [expected '$3' got '$2']"; FAIL=1; fi; }
echo "balances before: $BAL"
r "every pre-existing loan, entry and audit row unchanged (md5)" "$AFTER" "$BEFORE"
r "balances identical (current loan untouched; voided loans frozen as entered)" "$BAL2" "$BAL"
r "legacy entries stay unlinked (mortgage_id NULL)" "$($Q -c "select count(*) from mortgage_payments where mortgage_id is not null")/$($Q -c "select count(*) from mortgage_escrow_transactions where mortgage_id is not null")" "0/0"
r "no effects or review causes created for history" "$($Q -c "select count(*) from mortgage_balance_effects")/$($Q -c "select count(*) from mortgage_balance_review_causes")" "0/0"
r "existing loans start at versions/epochs 0" "$($Q -c "select string_agg(principal_version||':'||escrow_version||':'||principal_epoch||':'||escrow_epoch, ' ') from mortgage_details")" "0:0:0:0 0:0:0:0 0:0:0:0"
r "as-of dates unknown (NULL), never defaulted" "$($Q -c "select count(*) from mortgage_details where principal_as_of is not null or escrow_as_of is not null")" "0"
r "figure-entered time = each row's own last-write time" "$($Q -c "select string_agg(principal_figure_at::text, ' ' order by created_at) from mortgage_details")" "$UPD"
r "audit check kept another migration's table name" "$($Q -c "select pg_get_constraintdef(oid) like '%zz_other_migration_table%' and pg_get_constraintdef(oid) like '%mortgage_payments%' from pg_constraint where conname='audit_log_table_name_check'")" "t"
exit $FAIL
