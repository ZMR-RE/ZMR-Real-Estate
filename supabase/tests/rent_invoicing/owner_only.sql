-- Owner-only invoicing (owner-approved September 30, 2026). A manager and a
-- viewer of account A (existing membership roles, set up in setup.sql) and
-- account B's owner try every invoice action and invoicing setting. Each is
-- refused; nothing changes; memberships are untouched.
\set QUIET on
reset role;
select md5(string_agg(t::text, '|' order by t::text)) as before_invoices from (
  select id, state, version, number, amount_due, approved_snapshot from invoices) t \gset
select count(*) as before_events from invoice_events \gset
select id as draft from invoices where state in ('draft', 'approved') and lease_id is not null limit 1 \gset
select version as dv from invoices where id = :'draft' \gset
select id as issued from invoices where state = 'issued' and lease_id is not null limit 1 \gset
select version as iv from invoices where id = :'issued' \gset
select id as ag from agents where account_id = 'a0000000-0000-0000-0000-00000000000a' limit 1 \gset
select id as rule from tenancy_charge_rules where account_id = 'a0000000-0000-0000-0000-00000000000a' limit 1 \gset

set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-00000000000c';
select a('manager can read invoices', $q$(select count(*) > 0 from invoices)$q$);
select t('manager: create draft refused', $q$select create_invoice_draft('a5000000-0000-0000-0000-000000000003','2027-03-01')$q$, 'ZM370');
select t('manager: edit draft refused', $q$select update_invoice_draft('$q$ || :'draft' || $q$', $q$ || :dv || $q$, '{"visible_note":"x"}')$q$, 'ZM370');
select t('manager: approve refused', $q$select approve_invoice('$q$ || :'draft' || $q$', $q$ || :dv || $q$)$q$, 'ZM370');
select t('manager: reject refused', $q$select reject_invoice('$q$ || :'draft' || $q$', $q$ || :dv || $q$, 'no')$q$, 'ZM370');
select t('manager: issue refused', $q$select issue_invoice('$q$ || :'draft' || $q$', $q$ || :dv || $q$)$q$, 'ZM370');
select t('manager: revise refused', $q$select revise_invoice('$q$ || :'issued' || $q$', $q$ || :iv || $q$)$q$, 'ZM370');
select t('manager: cancel refused', $q$select cancel_invoice('$q$ || :'issued' || $q$', $q$ || :iv || $q$, 'no')$q$, 'ZM370');
select t('manager: direct invoice write refused', $q$update invoices set internal_note = 'x' where id = '$q$ || :'draft' || $q$'$q$, 'ZM370');
select t('manager: attach PDF refused', $q$select attach_invoice_pdf('$q$ || :'issued' || $q$', 'a0000000-0000-0000-0000-00000000000a/x/Invoices/m.pdf', 10, repeat('a',64))$q$, 'ZM370');
select t('manager: first-number setting refused', $q$select set_document_sequence_start('e2000000-0000-0000-0000-000000000002','receipt',50)$q$, 'ZM370');
select t('manager: entity invoice code refused', $q$update llcs set invoice_code = 'MM' where id = 'e3000000-0000-0000-0000-000000000003'$q$, 'ZM370');
select t('manager: property invoicing entity refused', $q$update properties set billing_entity_id = 'e1000000-0000-0000-0000-000000000001' where id = 'a1000000-0000-0000-0000-000000000003'$q$, 'ZM370');
select t('manager: property payment-instructions override refused', $q$update properties set payment_instructions_override = 'x' where id = 'a1000000-0000-0000-0000-000000000003'$q$, 'ZM370');
select t('manager: billing recipient flag refused', $q$update lease_tenants set is_billing_recipient = false where tenant_id = 'a3000000-0000-0000-0000-000000000005'$q$, 'ZM370');
select t('manager: tenancy billing terms refused', $q$update lease_billing_terms set due_day = 2 where lease_id = 'a5000000-0000-0000-0000-000000000001'$q$, 'ZM370');
select t('manager: new billing rule refused', $q$insert into tenancy_charge_rules (account_id, lease_id, kind, description, amount, effective_from) values ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000003','fixed_recurring','Test charge',10,'2027-01-01')$q$, 'ZM370');
select t('manager: edit billing rule refused', $q$update tenancy_charge_rules set description = 'x' where id = '$q$ || :'rule' || $q$'$q$, 'ZM370');
select t('manager: assistant assignment refused', $q$insert into agent_assignments (account_id, agent_id, lease_id) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'ag' || $q$','a5000000-0000-0000-0000-000000000003')$q$, 'ZM370');
select t('manager: assistant run refused', $q$select run_assistant_invoice_drafts('$q$ || :'ag' || $q$', '2027-03-01')$q$, 'ZM370');
select t('control: manager''s ordinary property edit still works', $q$update properties set address = address where id = 'a1000000-0000-0000-0000-000000000003'$q$, 'ok');
select t('control: manager can still record a payment (existing behaviour; shared invoice lock)', $q$insert into payments (account_id, invoice_id, amount, paid_date) values ('a0000000-0000-0000-0000-00000000000a','$q$ || :'issued' || $q$',1,'2026-11-04')$q$, 'ok');
select t('control: manager''s ordinary tenancy-member edit still works', $q$update lease_tenants set tenant_id = tenant_id where tenant_id = 'a3000000-0000-0000-0000-000000000005'$q$, 'ok');

set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-00000000000d';
select t('viewer: create draft refused', $q$select create_invoice_draft('a5000000-0000-0000-0000-000000000003','2027-03-01')$q$, 'ZM370');
select t('viewer: approve refused', $q$select approve_invoice('$q$ || :'draft' || $q$', $q$ || :dv || $q$)$q$, 'ZM370');
select t('viewer: entity invoice code refused', $q$update llcs set invoice_code = 'MM' where id = 'e3000000-0000-0000-0000-000000000003'$q$, 'ZM370');

set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-00000000000b';
select t('other account''s owner: can''t act on A''s invoice', $q$select approve_invoice('$q$ || :'draft' || $q$', $q$ || :dv || $q$)$q$, 'ZM323');
select t('other account''s owner: A''s tenancy is invisible to them', $q$select create_invoice_draft('a5000000-0000-0000-0000-000000000003','2027-03-01')$q$, 'ZM320');

reset role;
select a('refused attempts changed no invoice', $q$(select md5(string_agg(t::text, '|' order by t::text)) from (select id, state, version, number, amount_due, approved_snapshot from invoices) t) = '$q$ || :'before_invoices' || $q$'$q$);
select a('refused attempts logged no invoice events', $q$(select count(*) from invoice_events) = $q$ || :before_events);
select a('settings unchanged', $q$(select invoice_code = 'PP' from llcs where id = 'e3000000-0000-0000-0000-000000000003') and (select billing_entity_id = 'e3000000-0000-0000-0000-000000000003' and payment_instructions_override is null from properties where id = 'a1000000-0000-0000-0000-000000000003') and (select bool_and(is_billing_recipient) from lease_tenants where tenant_id = 'a3000000-0000-0000-0000-000000000005') and (select due_day = 1 from lease_billing_terms where lease_id = 'a5000000-0000-0000-0000-000000000001')$q$);
select a('memberships untouched (owner, manager, viewer as set up)', $q$(select count(*) = 3 from account_members where account_id = 'a0000000-0000-0000-0000-00000000000a' and (user_id, role) in (('aaaaaaaa-0000-0000-0000-00000000000a'::uuid,'owner'),('cccccccc-0000-0000-0000-00000000000c'::uuid,'manager'),('dddddddd-0000-0000-0000-00000000000d'::uuid,'viewer')))$q$);
