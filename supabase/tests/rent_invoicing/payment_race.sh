#!/bin/bash
# Run after run.sh (same disposable DB, 127.0.0.1:55434). T3 finding: a payment
# on an original invoice and the issue of its revision must never interleave
# into a payment stranded on a replaced invoice. Two sessions race each way;
# the invoice row lock (issue) vs share lock (payment guard) must serialize
# them. Prints PASS/FAIL lines; exits 1 on any failure.
set -u
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql -h 127.0.0.1 -p 55434 -U postgres -d zmr -X -q -t -A -v VERBOSITY=verbose"
pre="set role authenticated; set request.jwt.claim.sub='aaaaaaaa-0000-0000-0000-00000000000a';"
fails=0
check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1 (expected '$3', got '$2')"; fails=$((fails+1)); fi; }

# Fictional tenancy for the races (fixtures only; actions below run as the owner).
$PSQL -c "insert into leases (id, account_id, property_id, unit_id, rent_amount, start_date) values ('a5000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000002',900,'2027-01-01');
insert into lease_tenants (account_id, lease_id, tenant_id, is_billing_recipient) values ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000009','a3000000-0000-0000-0000-000000000001',true);
insert into lease_billing_terms (lease_id, account_id, due_day) values ('a5000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-00000000000a',1);" >/dev/null

prep() {  # period → "original_id revision_id revision_version"
  local x v r rv
  x=$($PSQL -c "$pre select create_invoice_draft('a5000000-0000-0000-0000-000000000009','$1');")
  v=$($PSQL -c "$pre select approve_invoice('$x', 1);")
  $PSQL -c "$pre select issue_invoice('$x', $v);" >/dev/null
  r=$($PSQL -c "$pre select revise_invoice('$x', (select version from invoices where id='$x'));")
  rv=$($PSQL -c "$pre select approve_invoice('$r', 1);")
  echo "$x $r $rv"
}

echo "P1: payment on the original holds its transaction 3s; revision issue starts 1s later"
read X1 R1 RV1 <<< "$(prep 2027-03-01)"
( $PSQL -c "$pre begin; insert into payments (account_id, invoice_id, amount, paid_date) values ('a0000000-0000-0000-0000-00000000000a','$X1',50,'2027-03-02'); select pg_sleep(3); commit;" >/dev/null 2>&1 ) &
sleep 1
start=$(date +%s)
out=$($PSQL -c "$pre select issue_invoice('$R1', $RV1);" 2>&1 | grep -oE "ZM[0-9]{3}" | head -1)
waited=$(( $(date +%s) - start )); wait
check "P1 revision issue refused after waiting for the payment" "$out" "ZM349"
check "P1 issue waited for the payment transaction (>=1s)" "$([ $waited -ge 1 ] && echo yes || echo no)" "yes"
check "P1 original still issued with the payment" "$($PSQL -c "select state || ':' || (select count(*) from payments where invoice_id = '$X1') from invoices where id = '$X1';")" "issued:1"
check "P1 revision not issued" "$($PSQL -c "select state || ':' || coalesce(number,'none') from invoices where id = '$R1';")" "approved:none"

echo "P2: revision issue holds its transaction 3s; payment on the original starts 1s later"
read X2 R2 RV2 <<< "$(prep 2027-04-01)"
( $PSQL -c "$pre begin; select issue_invoice('$R2', $RV2); select pg_sleep(3); commit;" >/dev/null 2>&1 ) &
sleep 1
start=$(date +%s)
out=$($PSQL -c "$pre insert into payments (account_id, invoice_id, amount, paid_date) values ('a0000000-0000-0000-0000-00000000000a','$X2',50,'2027-04-02');" 2>&1 | grep -oE "ZM[0-9]{3}" | head -1)
waited=$(( $(date +%s) - start )); wait
check "P2 payment refused after waiting for the issue" "$out" "ZM316"
check "P2 payment waited for the issue transaction (>=1s)" "$([ $waited -ge 1 ] && echo yes || echo no)" "yes"
check "P2 original superseded with no payment" "$($PSQL -c "select state || ':' || (select count(*) from payments where invoice_id = '$X2') from invoices where id = '$X2';")" "superseded:0"
check "P2 revision issued" "$($PSQL -c "select state from invoices where id = '$R2';")" "issued"

check "no payment anywhere sits on a superseded invoice" "$($PSQL -c "select count(*) from payments p join invoices i on i.id = p.invoice_id where i.state = 'superseded';")" "0"
echo "RESULT: $fails failed"
[ $fails -eq 0 ]
