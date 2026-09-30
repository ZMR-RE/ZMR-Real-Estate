#!/bin/bash
# Run after run.sh. Two sessions issue invoices of the SAME entity at the same
# time — one owner-created, one assistant-created. The entity's sequence row
# lock must serialize them: distinct, consecutive numbers, no error.
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql -h 127.0.0.1 -p 55434 -U postgres -d zmr -X -q -t -A"
pre="set role authenticated; set request.jwt.claim.sub='aaaaaaaa-0000-0000-0000-00000000000a';"
OWNER=$($PSQL -c "$pre select create_invoice_draft('a5000000-0000-0000-0000-000000000001','2026-11-01');")
# The assistant's December draft for the same entity (created by the trusted run in tests.sql).
ASSIST=$($PSQL -c "select id from invoices where lease_id='a5000000-0000-0000-0000-000000000001' and period_start='2026-12-01' and created_via='assistant';")
for id in $OWNER $ASSIST; do $PSQL -c "$pre select approve_invoice('$id', (select version from invoices where id='$id'));" >/dev/null; done
ts() { date +%H:%M:%S; }
echo "C1: owner issue holds the transaction 3s; assistant issue starts 1s later"
( $PSQL -c "$pre begin; select issue_invoice('$OWNER', (select version from invoices where id='$OWNER')); select pg_sleep(3); commit;" | head -1 | sed "s/^/  owner got /"; echo "  [owner committed $(ts)]" ) &
sleep 1; echo "  [assistant start $(ts)]"
$PSQL -c "$pre select issue_invoice('$ASSIST', (select version from invoices where id='$ASSIST'));" 2>&1 | sed "s/^/  assistant got /"; echo "  [assistant returned $(ts)]"; wait
echo "Result:"
$PSQL -c "select number, created_via from invoices where id in ('$OWNER','$ASSIST') order by number;" | sed 's/^/  /'
$PSQL -c "select 'duplicates: ' || count(*) from (select number from invoices where number is not null group by account_id, billing_entity_id, number having count(*) > 1) d;" | sed 's/^/  /'
