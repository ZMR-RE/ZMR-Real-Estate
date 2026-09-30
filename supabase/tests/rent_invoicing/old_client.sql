-- Rehearsal: the CURRENTLY DEPLOYED dashboard (pre-Stage-1 rentOpsQueries.ts)
-- running against the Stage 1 database — e.g. during the database-before-
-- frontend release gap, or a browser tab left open across the release.
-- Replays the old client's exact statements as a signed-in member.
\set QUIET on
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
select count(*) as before_count from invoices \gset

-- Old createInvoice: plain insert of these columns (rentOpsQueries.ts:53-68)
select t('old "Create invoice" is refused with a reload instruction', $q$insert into invoices (account_id, property_id, billed_to, period_start, period_end, amount_due, due_date, notes) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001','Riley Example','2027-01-01','2027-01-31',1450,'2027-01-01',null)$q$, 'ZM311');
select a('refusal saved nothing', $q$(select count(*) from invoices) = $q$ || :before_count);

-- Old listInvoices: same columns + property + payments embed (rentOpsQueries.ts:42-51)
select a('old invoice list query still works (every column it reads exists)', $q$(select count(*) > 0 from (select i.id, i.property_id, i.billed_to, i.period_start, i.period_end, i.amount_due, i.due_date, i.notes, p.id, p.name, p.address, (select count(*) from payments pm where pm.invoice_id = i.id) from invoices i join properties p on p.id = i.property_id) q)$q$);

-- Old recordPayment on a legacy invoice (rentOpsQueries.ts:70-83)
select t('old "Record payment" on an existing invoice still works', $q$insert into payments (account_id, invoice_id, amount, paid_date, method, notes) values ('a0000000-0000-0000-0000-00000000000a','a9000000-0000-0000-0000-000000000001',10,'2026-10-02','Check',null)$q$, 'ok');

-- A stale tab would list drafts created by the new flow (it can't filter by
-- state). Recording a payment against one is refused — no money is ever
-- attached to an unissued invoice.
select a('a stale tab would see drafts in its list (display only)', $q$exists (select 1 from invoices where state = 'draft')$q$);
select t('old "Record payment" on a draft is refused', $q$insert into payments (account_id, invoice_id, amount, paid_date) select account_id, id, 10, '2026-10-02' from invoices where state = 'draft' limit 1$q$, 'ZM316');
