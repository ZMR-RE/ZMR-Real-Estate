-- T4 Stage 1 rule checks, run as the `authenticated` role with a simulated
-- signed-in user (RLS applies). Every line prints PASS/FAIL.
\set QUIET on
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
\set L1 '''a5000000-0000-0000-0000-000000000001'''
\set L2 '''a5000000-0000-0000-0000-000000000002'''
\set L3 '''a5000000-0000-0000-0000-000000000003'''
\set L4 '''a5000000-0000-0000-0000-000000000004'''
\set LB '''b5000000-0000-0000-0000-00000000000b'''

-- Direct writes are refused on every invoice table
select t('direct invoice insert refused', $q$insert into invoices (account_id, property_id, period_start, period_end, amount_due, due_date) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001','2026-11-01','2026-11-30',1,'2026-11-01')$q$, 'ZM311');
select t('direct line insert refused', $q$insert into invoice_lines (account_id, invoice_id, line_kind, description, amount) values ('a0000000-0000-0000-0000-00000000000a','a9000000-0000-0000-0000-000000000001','charge','x',1)$q$, 'ZM313');
select t('direct sequence write refused', $q$insert into document_sequences (account_id, entity_id, doc_type, next_value) values ('a0000000-0000-0000-0000-00000000000a','e1000000-0000-0000-0000-000000000001','invoice',1)$q$, 'ZM313');
select t('legacy invoice update refused', $q$update invoices set amount_due = 1 where id = 'a9000000-0000-0000-0000-000000000001'$q$, 'ZM311');
select t('period must start on the 1st', $q$select get_invoice_draft_blockers('a5000000-0000-0000-0000-000000000001','2026-10-02')$q$, 'ZM317');

-- Missing structured information blocks drafting; nothing inferred
select a('incomplete tenancy lists every gap', $q$get_invoice_draft_blockers('a5000000-0000-0000-0000-000000000004','2026-10-01') @> array['lease_rent','due_day','billing_entity','billing_recipient']$q$);
select t('incomplete tenancy cannot be drafted', $q$select create_invoice_draft('a5000000-0000-0000-0000-000000000004','2026-10-01')$q$, 'ZM320');
select a('other account''s tenancy is invisible', $q$get_invoice_draft_blockers('b5000000-0000-0000-0000-00000000000b','2026-10-01') = array['lease_not_found']$q$);
select t('other account''s tenancy cannot be drafted', $q$select create_invoice_draft('b5000000-0000-0000-0000-00000000000b','2026-10-01')$q$, 'ZM320');

-- Drafting from structured records
select create_invoice_draft(:L1, '2026-10-01') as inv1 \gset
select a('full month rent line and due day', $q$(select amount_due = 1450 and due_date = '2026-10-01' and state = 'draft' and number is null and recipient_name = 'Riley Example' from invoices where id = '$q$ || :'inv1' || $q$')$q$);
select t('one charge per tenancy and period', $q$select create_invoice_draft('a5000000-0000-0000-0000-000000000001','2026-10-01')$q$, 'ZM320');
select create_invoice_draft(:L2, '2026-10-01') as inv2 \gset
select a('daily prorating: 17 of 31 days, due day 31', $q$(select amount_due = 765.00 and due_date = '2026-10-31' from invoices where id = '$q$ || :'inv2' || $q$')$q$);
select a('co-tenants billed as one charge; recipients from profiles (blank contacts kept blank)', $q$(select recipient_name = 'Jordan Sample & Sam Sample' and jsonb_array_length(recipients) = 2 and recipients->0->>'email' = 'jordan@example.test' and recipients->0->>'phone' is null and recipients->1->>'phone' = '(555) 010-3333' from invoices where id = '$q$ || :'inv2' || $q$')$q$);
select a('prorated line described with the days', $q$(select description like '%(17 of 31 days)' and line_kind = 'prorated_rent' from invoice_lines where invoice_id = '$q$ || :'inv2' || $q$')$q$);
select t('no payment against a draft', $q$insert into payments (account_id, invoice_id, amount, paid_date) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'inv1' || $q$',10,'2026-10-02')$q$, 'ZM316');

-- Versions and approval
select t('stale edit refused', $q$select update_invoice_draft('$q$ || :'inv1' || $q$', 99, '{"internal_note":"x"}')$q$, 'ZM324');
select t('unknown field refused', $q$select update_invoice_draft('$q$ || :'inv1' || $q$', 1, '{"amount_due":1}')$q$, 'ZM326');
select t('issue before approval refused', $q$select issue_invoice('$q$ || :'inv1' || $q$', 1)$q$, 'ZM325');
select approve_invoice(:'inv1', 1) as v \gset
select update_invoice_draft(:'inv1', :v, '{"internal_note":"checked against lease"}') as v \gset
select a('internal note keeps approval', $q$(select state = 'approved' and approved_material_version = material_version from invoices where id = '$q$ || :'inv1' || $q$')$q$);
select update_invoice_draft(:'inv1', :v, '{"visible_note":"Thank you!"}') as v \gset
select a('visible note clears approval', $q$(select state = 'draft' and approved_material_version is null from invoices where id = '$q$ || :'inv1' || $q$')$q$);
select a('approval_cleared event recorded', $q$exists (select 1 from invoice_events where invoice_id = '$q$ || :'inv1' || $q$' and event = 'approval_cleared')$q$);
select approve_invoice(:'inv1', :v) as v \gset
update tenants set email = 'riley.new@example.test' where id = 'a3000000-0000-0000-0000-000000000001';
select a('profile edits don''t change a draft by themselves', $q$(select recipients->0->>'email' = 'riley@example.test' and state = 'approved' from invoices where id = '$q$ || :'inv1' || $q$')$q$);
select update_invoice_draft(:'inv1', :v, '{"refresh_recipients":true}') as v \gset
select a('recipient change clears approval', $q$(select state = 'draft' from invoices where id = '$q$ || :'inv1' || $q$')$q$);
select approve_invoice(:'inv1', :v) as v \gset
select update_invoice_draft(:'inv1', :v, '{"lines":[{"line_kind":"rent","description":"Rent — October 2026","amount":1450},{"line_kind":"credit","description":"Repair credit","amount":-50}]}') as v \gset
select a('line change clears approval and totals lines', $q$(select state = 'draft' and amount_due = 1400 from invoices where id = '$q$ || :'inv1' || $q$')$q$);
select t('credits over charges refused', $q$select update_invoice_draft('$q$ || :'inv1' || $q$', $q$ || :v || $q$, '{"lines":[{"line_kind":"credit","description":"x","amount":-5}]}')$q$, 'ZM330');
select approve_invoice(:'inv1', :v) as v \gset

-- Issuance and numbering
update entity_document_branding set document_phone = '(555) 010-9999' where entity_id = 'e1000000-0000-0000-0000-000000000001';
select t('issue refused when printed content changed since approval', $q$select issue_invoice('$q$ || :'inv1' || $q$', $q$ || :v || $q$)$q$, 'ZM348');
update entity_document_branding set document_phone = null where entity_id = 'e1000000-0000-0000-0000-000000000001';
update properties set payment_instructions_override = 'Check to the Unit 1 site office' where id = 'a1000000-0000-0000-0000-000000000001';
select t('payment-instructions override also requires re-approval', $q$select issue_invoice('$q$ || :'inv1' || $q$', $q$ || :v || $q$)$q$, 'ZM348');
select a('snapshot shows the override as the source', $q$(invoice_print_snapshot('$q$ || :'inv1' || $q$')->'payment_instructions'->>'source') = 'property'$q$);
update properties set payment_instructions_override = null where id = 'a1000000-0000-0000-0000-000000000001';
select approve_invoice(:'inv1', :v) as v \gset
select issue_invoice(:'inv1', :v) as n1 \gset
select a('first number is A-INV-000001', $q$'$q$ || :'n1' || $q$' = 'A-INV-000001'$q$);
select a('issued document is the approved print snapshot', $q$(select issued_snapshot->'issuer'->>'legal_name' = 'Example Holdings LLC' and issued_snapshot->'payment_instructions'->>'text' like 'Zelle%' and issued_snapshot->'payment_instructions'->>'source' = 'entity' and issued_snapshot->'branding'->>'heading_color' = '#1F4E79' and issued_snapshot->'recipients'->0->>'phone' = '(555) 010-1111' and issued_snapshot->'rental'->>'unit_label' = 'Unit 1' from invoices where id = '$q$ || :'inv1' || $q$')$q$);
update entity_document_branding set payment_instructions = 'Changed later' where entity_id = 'e1000000-0000-0000-0000-000000000001';
select a('later settings change leaves the issued snapshot alone', $q$(select issued_snapshot->'payment_instructions'->>'text' like 'Zelle%' from invoices where id = '$q$ || :'inv1' || $q$')$q$);
select version as v1 from invoices where id = :'inv1' \gset
select t('issued invoice not editable through actions', $q$select update_invoice_draft('$q$ || :'inv1' || $q$', $q$ || :v1 || $q$, '{"internal_note":"x"}')$q$, 'ZM325');
select t('numbered invoice never deleted', $q$delete from invoices where id = '$q$ || :'inv1' || $q$'$q$, 'ZM310');
select approve_invoice(:'inv2', 1) as v \gset
select issue_invoice(:'inv2', :v) as n2 \gset
select a('same entity continues: A-INV-000002', $q$'$q$ || :'n2' || $q$' = 'A-INV-000002'$q$);
select create_invoice_draft(:L3, '2026-10-01') as inv3 \gset
select approve_invoice(:'inv3', 1) as v \gset
select issue_invoice(:'inv3', :v) as n3 \gset
select a('other entity has its own sequence: SRP-INV-000001', $q$'$q$ || :'n3' || $q$' = 'SRP-INV-000001'$q$);
select t('payment against issued invoice ok', $q$insert into payments (account_id, invoice_id, amount, paid_date) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'inv3' || $q$',700,'2026-10-05')$q$, 'ok');
select t('payment against legacy invoice still ok', $q$insert into payments (account_id, invoice_id, amount, paid_date) values ('a0000000-0000-0000-0000-00000000000a','a9000000-0000-0000-0000-000000000001',1450,'2026-09-01')$q$, 'ok');

-- Revision
select t('revision refused while payments are recorded', $q$select revise_invoice('$q$ || :'inv3' || $q$', (select version from invoices where id = '$q$ || :'inv3' || $q$'))$q$, 'ZM349');
select revise_invoice(:'inv1', :v1) as rev \gset
select t('only one revision at a time', $q$select revise_invoice('$q$ || :'inv1' || $q$', $q$ || :v1 || $q$)$q$, 'ZM336');
select update_invoice_draft(:'rev', 1, '{"visible_note":"Corrected note"}') as v \gset
select t('revision keeps its issuer', $q$select update_invoice_draft('$q$ || :'rev' || $q$', $q$ || :v || $q$, '{"billing_entity_id":"e2000000-0000-0000-0000-000000000002"}')$q$, 'ZM328');
select approve_invoice(:'rev', :v) as v \gset
select issue_invoice(:'rev', :v) as nr \gset
select a('revision number A-INV-000001-R2', $q$'$q$ || :'nr' || $q$' = 'A-INV-000001-R2'$q$);
select a('original superseded, kept with its number', $q$(select state = 'superseded' and number = 'A-INV-000001' from invoices where id = '$q$ || :'inv1' || $q$')$q$);
select a('revision took no sequence number', $q$(select next_value = 3 from document_sequences where entity_id = 'e1000000-0000-0000-0000-000000000001' and doc_type = 'invoice')$q$);

-- Cancellation never frees a number
select version as vc from invoices where id = :'inv2' \gset
select t('cancel needs a reason', $q$select cancel_invoice('$q$ || :'inv2' || $q$', $q$ || :vc || $q$, ' ')$q$, 'ZM337');
select cancel_invoice(:'inv2', :vc, 'Tenant moved in a month later') \gset
select t('cancel refused while payments exist', $q$select cancel_invoice('$q$ || :'inv3' || $q$', (select version from invoices where id = '$q$ || :'inv3' || $q$'), 'x')$q$, 'ZM338');
select create_invoice_draft(:L2, '2026-11-01') as inv4 \gset
select approve_invoice(:'inv4', 1) as v \gset
select issue_invoice(:'inv4', :v) as n4 \gset
-- T3 finding: a payment recorded on the original AFTER its revision was
-- opened must block issuing the revision (never strand it on a replaced invoice).
select revise_invoice(:'inv4', (select version from invoices where id = :'inv4')) as rev4 \gset
select approve_invoice(:'rev4', 1) as v4 \gset
select t('payment on the original while its revision is open', $q$insert into payments (account_id, invoice_id, amount, paid_date) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'inv4' || $q$',10,'2026-11-03')$q$, 'ok');
select t('revision issue refused: payment arrived after the revision was opened', $q$select issue_invoice('$q$ || :'rev4' || $q$', $q$ || :v4 || $q$)$q$, 'ZM349');
select a('original still issued, payment still on it, revision not issued', $q$(select state = 'issued' from invoices where id = '$q$ || :'inv4' || $q$') and (select count(*) = 1 from payments where invoice_id = '$q$ || :'inv4' || $q$') and (select state = 'approved' and number is null from invoices where id = '$q$ || :'rev4' || $q$')$q$);
select reject_invoice(:'rev4', :v4, 'payment arrived; revision withdrawn') \gset
select t('payments on a superseded or draft invoice stay refused', $q$insert into payments (account_id, invoice_id, amount, paid_date) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'rev4' || $q$',10,'2026-11-03')$q$, 'ZM316');
select a('cancelled number not reused: next is A-INV-000003', $q$'$q$ || :'n4' || $q$' = 'A-INV-000003'$q$);
select a('cancelled invoice keeps number', $q$(select state = 'cancelled' and number = 'A-INV-000002' from invoices where id = '$q$ || :'inv2' || $q$')$q$);

-- Entity settings
select t('sequence start locked after issuance', $q$select set_document_sequence_start('e1000000-0000-0000-0000-000000000001','invoice',500)$q$, 'ZM339');
select t('sequence start settable before issuance', $q$select set_document_sequence_start('e3000000-0000-0000-0000-000000000003','invoice',120)$q$, 'ok');
select t('sequence start can be corrected before issuance', $q$select set_document_sequence_start('e3000000-0000-0000-0000-000000000003','invoice',121)$q$, 'ok');
select t('invoice code locked once the entity has issued', $q$update llcs set invoice_code = 'EX' where id = 'e1000000-0000-0000-0000-000000000001'$q$, 'ZM347');
select t('invoice code editable before first issue', $q$update llcs set invoice_code = 'PX' where id = 'e3000000-0000-0000-0000-000000000003'$q$, 'ok');
update llcs set invoice_code = null where id = 'e3000000-0000-0000-0000-000000000003';
select t('invoice code format enforced', $q$update llcs set invoice_code = 'bad code' where id = 'e3000000-0000-0000-0000-000000000003'$q$, '23514');
select t('invoice codes unique per account', $q$update llcs set invoice_code = 'A' where id = 'e3000000-0000-0000-0000-000000000003'$q$, '23505');
select t('billing entity from another account refused', $q$update properties set billing_entity_id = 'eb000000-0000-0000-0000-00000000000b' where id = 'a1000000-0000-0000-0000-000000000003'$q$, 'ZM300');
update properties set billing_entity_id = 'e3000000-0000-0000-0000-000000000003' where id = 'a1000000-0000-0000-0000-000000000003';
update leases set rent_amount = 800 where id = :L4;
insert into lease_billing_terms (lease_id, account_id, due_day) values (:L4, 'a0000000-0000-0000-0000-00000000000a', 1);
update lease_tenants set is_billing_recipient = true where lease_id = :L4;
select create_invoice_draft(:L4, '2026-10-01') as inv5 \gset
select approve_invoice(:'inv5', 1) as v \gset
select t('entity without code cannot issue', $q$select issue_invoice('$q$ || :'inv5' || $q$', $q$ || :v || $q$)$q$, 'ZM333');
update llcs set invoice_code = 'PP' where id = 'e3000000-0000-0000-0000-000000000003';
select t('new entity code changes the printed issuer → approve again', $q$select issue_invoice('$q$ || :'inv5' || $q$', $q$ || :v || $q$)$q$, 'ZM348');
select approve_invoice(:'inv5', :v) as v \gset
select issue_invoice(:'inv5', :v) as n5 \gset
select a('configured start used: PP-INV-000121', $q$'$q$ || :'n5' || $q$' = 'PP-INV-000121'$q$);

-- Preserved PDFs: one path (attach_invoice_pdf) with a recorded digest
\set SHA '''0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'''
select t('direct PDF link refused', $q$insert into documents (account_id, property_id, category, storage_path, file_size, invoice_id) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000002','Invoices','a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/x.pdf',1,'$q$ || :'inv3' || $q$')$q$, 'ZM315');
select t('attach needs a SHA-256 digest', $q$select attach_invoice_pdf('$q$ || :'inv3' || $q$', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/SRP-INV-000001_2026-10_Unit-A.pdf', 5000, 'not-a-hash')$q$, 'ZM345');
select t('attach refuses a path outside the invoice''s property', $q$select attach_invoice_pdf('$q$ || :'inv3' || $q$', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000001/Invoices/x.pdf', 5000, $q$ || quote_literal(:SHA) || $q$)$q$, 'ZM346');
select t('attach refuses another invoice''s file (number prefix)', $q$select attach_invoice_pdf('$q$ || :'inv3' || $q$', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/SRP-INV-000009_2026-10_Unit-A.pdf', 5000, $q$ || quote_literal(:SHA) || $q$)$q$, 'ZM346');
select t('attach refuses a lookalike prefix without the separator', $q$select attach_invoice_pdf('$q$ || :'inv3' || $q$', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/SRP-INV-0000012_x.pdf', 5000, $q$ || quote_literal(:SHA) || $q$)$q$, 'ZM346');
select t('PDF attaches to issued invoice', $q$select attach_invoice_pdf('$q$ || :'inv3' || $q$', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/SRP-INV-000001_2026-10_Unit-A.pdf', 5000, $q$ || quote_literal(:SHA) || $q$)$q$, 'ok');
select t('only one PDF per invoice revision', $q$select attach_invoice_pdf('$q$ || :'inv3' || $q$', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/SRP-INV-000001_again.pdf', 5000, $q$ || quote_literal(:SHA) || $q$)$q$, '23505');
select t('issued PDF cannot be deleted', $q$delete from documents where invoice_id = '$q$ || :'inv3' || $q$'$q$, 'ZM314');
select t('issued PDF cannot be relinked', $q$update documents set storage_path = 'moved.pdf' where invoice_id = '$q$ || :'inv3' || $q$'$q$, 'ZM314');
select a('digest recorded in the immutable history', $q$exists (select 1 from invoice_events where invoice_id = '$q$ || :'inv3' || $q$' and event = 'pdf_attached' and detail->>'sha256' = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' and (detail->>'file_size')::int = 5000)$q$);
select t('history rows cannot be edited', $q$update invoice_events set detail = '{}' where invoice_id = '$q$ || :'inv3' || $q$'$q$, 'ZM313');

-- Assistant: same records, skips instead of guessing, one run at a time
select ensure_rent_payments_agent('a0000000-0000-0000-0000-00000000000a') as ag \gset
select a('assistant created once', $q$ensure_rent_payments_agent('a0000000-0000-0000-0000-00000000000a') = '$q$ || :'ag' || $q$'$q$);
insert into agent_assignments (account_id, agent_id, lease_id, invoice_note) values
 ('a0000000-0000-0000-0000-00000000000a', :'ag', :L1, 'Pay by the 1st, please.'),
 ('a0000000-0000-0000-0000-00000000000a', :'ag', :L3, null);
select t('assignment to another account''s tenancy refused', $q$insert into agent_assignments (account_id, agent_id, lease_id) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'ag' || $q$','b5000000-0000-0000-0000-00000000000b')$q$, 'ZM340');
select run_assistant_invoice_drafts(:'ag', '2026-12-01') as run1 \gset
select a('owner drafts are always the owner''s', $q$(select created_via = 'owner' and agent_run_id is null from invoices where id = '$q$ || :'inv1' || $q$')$q$);
select t('no client can record an assistant run', $q$insert into agent_runs (account_id, agent_id, kind, period_start) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'ag' || $q$','draft_invoices','2027-01-01')$q$, 'ZM356');
select t('assistant provenance can''t be passed to the public draft action', $q$select create_invoice_draft('a5000000-0000-0000-0000-000000000003','2027-02-01','assistant')$q$, '22P02');
select a('run drafted both tenancies into Rent ops invoices', $q$(select count(*) = 2 from invoices where agent_run_id = '$q$ || :'run1' || $q$' and created_via = 'assistant' and state = 'draft')$q$);
select a('tenant note printed from the assignment', $q$(select visible_note = 'Pay by the 1st, please.' from invoices where agent_run_id = '$q$ || :'run1' || $q$' and lease_id = 'a5000000-0000-0000-0000-000000000001')$q$);
select t('PDF cannot attach to a draft', $q$insert into documents (account_id, property_id, category, storage_path, file_size, invoice_id) select account_id, property_id, 'Invoices', 'x/draft.pdf', 1, id from invoices where agent_run_id = '$q$ || :'run1' || $q$' limit 1$q$, 'ZM315');
select run_assistant_invoice_drafts(:'ag', '2026-12-01') as run2 \gset
select a('rerun skips already-invoiced tenancies', $q$(select outcome = 'completed_with_skips' and jsonb_array_length(summary->'drafted') = 0 from agent_runs where id = '$q$ || :'run2' || $q$')$q$);
select a('owner and assistant drafts share one table', $q$(select count(*) from invoices where lease_id = 'a5000000-0000-0000-0000-000000000001' and period_start = '2026-12-01') = 1$q$);

-- Account B sees none of A's billing records
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-00000000000b';
select a('B sees no A invoices, lines, events, sequences or runs', $q$(select count(*) from invoices where account_id = 'a0000000-0000-0000-0000-00000000000a') + (select count(*) from invoice_lines) + (select count(*) from invoice_events) + (select count(*) from document_sequences) + (select count(*) from agent_runs) = 0$q$);
select t('B cannot approve A''s invoice', $q$select approve_invoice('$q$ || :'inv5' || $q$', 1)$q$, 'ZM323');

-- Tenancy billing rules (fictional; L3 = 27 Sample Road Unit A, $1,720)
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
\set L3 '''a5000000-0000-0000-0000-000000000003'''
select t('fixed recurring rule (half of a $120 monthly cost)', $q$insert into tenancy_charge_rules (account_id, lease_id, kind, description, amount, basis_total, share_percent, effective_from) values ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000003','fixed_recurring','Pest control',60,120,50,'2027-01-01')$q$, 'ok');
select t('variable statement-based rule (50% share)', $q$insert into tenancy_charge_rules (account_id, lease_id, kind, description, share_percent, effective_from) values ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000003','variable_statement','Gas',50,'2027-01-01')$q$, 'ok');
select t('one-time credit for January', $q$insert into tenancy_charge_rules (account_id, lease_id, kind, description, amount, one_time_period) values ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000003','one_time','Filter credit',-25,'2027-01-01')$q$, 'ok');
select t('fixed rule needs an amount', $q$insert into tenancy_charge_rules (account_id, lease_id, kind, description) values ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000003','fixed_recurring','x')$q$, '23514');
select t('variable rule never carries a guessed amount', $q$insert into tenancy_charge_rules (account_id, lease_id, kind, description, amount, share_percent) values ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000003','variable_statement','x',40,50)$q$, '23514');
select t('rule on another account''s tenancy refused', $q$insert into tenancy_charge_rules (account_id, lease_id, kind, description, amount) values ('a0000000-0000-0000-0000-00000000000a','b5000000-0000-0000-0000-00000000000b','fixed_recurring','x',5)$q$, 'ZM360');
select id as fixed_rule from tenancy_charge_rules where description = 'Pest control' \gset
select id as gas_rule from tenancy_charge_rules where description = 'Gas' \gset
select t('statements only for variable rules', $q$insert into tenancy_charge_statements (account_id, rule_id, service_period_start, statement_amount) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'fixed_rule' || $q$','2026-12-01',10)$q$, 'ZM363');
select a('missing December gas statement is unresolved for January', $q$(select count(*) = 1 from unresolved_variable_charges('a5000000-0000-0000-0000-000000000003','2027-01-01'))$q$);
select create_invoice_draft(:L3, '2027-01-01') as jan \gset
select a('January: rent + pest control (basis shown) + credit; no estimated gas', $q$(select string_agg(description || '=' || amount, '; ' order by sort_order) = 'Rent — January 2027=1720.00; Pest control (50% of $120.00)=60.00; Filter credit=-25.00' from invoice_lines where invoice_id = '$q$ || :'jan' || $q$')$q$);
select a('January total 1755.00', $q$(select amount_due = 1755 from invoices where id = '$q$ || :'jan' || $q$')$q$);
select a('earlier unpaid invoice listed for reference only', $q$(select p->>'number' = 'SRP-INV-000001' and (p->>'outstanding')::numeric = 1020 from jsonb_array_elements(invoice_print_snapshot('$q$ || :'jan' || $q$')->'prior_unpaid') p)$q$);
select t('no second draft for the same tenancy and month', $q$select create_invoice_draft('a5000000-0000-0000-0000-000000000003','2027-01-01')$q$, 'ZM320');
select t('statement entered with its amount', $q$insert into tenancy_charge_statements (account_id, rule_id, service_period_start, statement_amount) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'gas_rule' || $q$','2026-12-01',84.20)$q$, 'ok');
select t('one statement per rule and month', $q$insert into tenancy_charge_statements (account_id, rule_id, service_period_start, statement_amount) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'gas_rule' || $q$','2026-12-01',90)$q$, '23505');
select t('clients can''t mark a statement billed', $q$update tenancy_charge_statements set billed_invoice_id = '$q$ || :'jan' || $q$' where rule_id = '$q$ || :'gas_rule' || $q$'$q$, 'ZM361');
select reject_invoice(:'jan', 1, 'Add the gas statement') \gset
select a('rejecting releases the one-time credit', $q$(select applied_invoice_id is null from tenancy_charge_rules where description = 'Filter credit')$q$);
select create_invoice_draft(:L3, '2027-01-01') as jan2 \gset
select a('redraft: gas at 50% of the statement, credit billed once', $q$(select string_agg(description || '=' || amount, '; ' order by sort_order) = 'Rent — January 2027=1720.00; Pest control (50% of $120.00)=60.00; Gas — 50% of December 2026 statement ($84.20)=42.10; Filter credit=-25.00' from invoice_lines where invoice_id = '$q$ || :'jan2' || $q$')$q$);
select t('a billed statement can''t be edited', $q$update tenancy_charge_statements set statement_amount = 99 where rule_id = '$q$ || :'gas_rule' || $q$'$q$, 'ZM362');
select create_invoice_draft(:L3, '2027-02-01') as feb \gset
select a('February: fixed rule again; gas and credit not billed twice', $q$(select string_agg(description || '=' || amount, '; ' order by sort_order) = 'Rent — February 2027=1720.00; Pest control (50% of $120.00)=60.00' from invoice_lines where invoice_id = '$q$ || :'feb' || $q$')$q$);
select a('missing January gas statement stays unresolved for February', $q$(select count(*) = 1 from unresolved_variable_charges('a5000000-0000-0000-0000-000000000003','2027-02-01'))$q$);
select t('rule on a tenancy that is ending', $q$insert into tenancy_charge_rules (account_id, lease_id, kind, description, amount, effective_from) values ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000001','fixed_recurring','Parking',25,'2027-01-01')$q$, 'ok');
select a('lease end flags the rule for review', $q$(select count(*) = 1 from charge_rules_needing_review('a5000000-0000-0000-0000-000000000001','2026-12-15'))$q$);
select a('open-ended tenancy: nothing to review', $q$(select count(*) = 0 from charge_rules_needing_review('a5000000-0000-0000-0000-000000000003','2027-01-15'))$q$);

-- Earlier balances: referenced once, never charged; renewals only by explicit link
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
select id as l1dec from invoices where lease_id = :L1 and period_start = '2026-12-01' and created_via = 'assistant' \gset
select a('replaced October invoice counted once (its revision), never the superseded original', $q$(select count(*) = 1 and min(p->>'number') = '$q$ || :'nr' || $q$' from jsonb_array_elements(invoice_print_snapshot('$q$ || :'l1dec' || $q$')->'prior_unpaid') p where p->>'period_start' = '2026-10-01')$q$);
select a('totals: this invoice and total outstanding kept separate, sum exact', $q$(select (s->'balance'->>'this_invoice')::numeric = (s->>'amount_due')::numeric and (s->'balance'->>'total_outstanding')::numeric = (s->>'amount_due')::numeric + (select coalesce(sum((p->>'outstanding')::numeric), 0) from jsonb_array_elements(s->'prior_unpaid') p) from invoice_print_snapshot('$q$ || :'l1dec' || $q$') s)$q$);
select a('earlier balances never become lines of this invoice', $q$not exists (select 1 from invoice_lines where invoice_id = '$q$ || :'l1dec' || $q$' and description like '%INV-%')$q$);
-- A renewal written as a new lease (L6, same unit, same billed tenant)
insert into leases (id, account_id, property_id, unit_id, rent_amount, start_date) values ('a5000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000001',1500,'2027-01-01');
insert into lease_tenants (account_id, lease_id, tenant_id, is_billing_recipient) values ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000006','a3000000-0000-0000-0000-000000000001',true);
insert into lease_billing_terms (lease_id, account_id, due_day) values ('a5000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-00000000000a',1);
select create_invoice_draft('a5000000-0000-0000-0000-000000000006', '2027-01-01') as l6jan \gset
select a('without a link, a new tenancy shows no earlier balance (never inferred from the tenant)', $q$(select jsonb_array_length(s->'prior_unpaid') = 0 and jsonb_array_length(s->'balance_review') = 0 from invoice_print_snapshot('$q$ || :'l6jan' || $q$') s)$q$);
select t('a tenancy can''t continue from itself', $q$update lease_billing_terms set continues_lease_id = lease_id where lease_id = 'a5000000-0000-0000-0000-000000000006'$q$, 'ZM302');
select t('can''t continue from a later tenancy', $q$update lease_billing_terms set continues_lease_id = 'a5000000-0000-0000-0000-000000000006' where lease_id = 'a5000000-0000-0000-0000-000000000001'$q$, 'ZM302');
select t('can''t continue from another account''s tenancy', $q$update lease_billing_terms set continues_lease_id = 'b5000000-0000-0000-0000-00000000000b' where lease_id = 'a5000000-0000-0000-0000-000000000006'$q$, 'ZM302');
select t('owner links the renewal explicitly', $q$update lease_billing_terms set continues_lease_id = 'a5000000-0000-0000-0000-000000000001' where lease_id = 'a5000000-0000-0000-0000-000000000006'$q$, 'ok');
select a('linked renewal: earlier tenancy''s unpaid invoices referenced, labelled, counted once', $q$(select count(*) > 0 and bool_and(p->>'source' = 'continued_tenancy') and count(distinct p->>'number') = count(*) from jsonb_array_elements(invoice_print_snapshot('$q$ || :'l6jan' || $q$')->'prior_unpaid') p)$q$);
select a('linked renewal: this invoice''s own amount is unchanged (no new charge)', $q$(select (s->'balance'->>'this_invoice')::numeric = 1500 and (s->>'amount_due')::numeric = 1500 and (s->'balance'->>'total_outstanding')::numeric > 1500 from invoice_print_snapshot('$q$ || :'l6jan' || $q$') s)$q$);
select t('an earlier tenancy is continued by at most one', $q$update lease_billing_terms set continues_lease_id = 'a5000000-0000-0000-0000-000000000001' where lease_id = 'a5000000-0000-0000-0000-000000000002'$q$, '23505');
select update_invoice_draft(:'l6jan', 1, '{"billing_entity_id":"e2000000-0000-0000-0000-000000000002"}') as v6 \gset
select a('different issuing entity: earlier invoices are a separate liability — review only, not in the total', $q$(select jsonb_array_length(s->'prior_unpaid') = 0 and jsonb_array_length(s->'balance_review') > 0 and (s->'balance'->>'total_outstanding')::numeric = 1500 and s->'balance_review'->0->>'reason' like 'Issued by a different entity%' from invoice_print_snapshot('$q$ || :'l6jan' || $q$') s)$q$);
-- A linked tenancy with no billed tenant in common: uncertain responsibility
insert into leases (id, account_id, property_id, unit_id, rent_amount, start_date) values ('a5000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000002',1400,'2027-02-01');
insert into lease_tenants (account_id, lease_id, tenant_id, is_billing_recipient) values ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000007','a3000000-0000-0000-0000-000000000005',true);
insert into lease_billing_terms (lease_id, account_id, due_day, continues_lease_id) values ('a5000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-00000000000a',1,'a5000000-0000-0000-0000-000000000002');
select create_invoice_draft('a5000000-0000-0000-0000-000000000007', '2027-02-01') as l7feb \gset
select a('no billed tenant in common: flagged for review, not counted', $q$(select jsonb_array_length(s->'prior_unpaid') = 0 and jsonb_array_length(s->'balance_review') > 0 and s->'balance_review'->0->>'reason' like '%who owes it needs your review' and (s->'balance'->>'total_outstanding')::numeric = (s->>'amount_due')::numeric from invoice_print_snapshot('$q$ || :'l7feb' || $q$') s)$q$);

-- No account-specific document pick-list rows are seeded
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
select a('no Invoices pick-list rows were seeded', $q$not exists (select 1 from pick_list_options where list_name = 'document_type' and value = 'Invoices')$q$);
