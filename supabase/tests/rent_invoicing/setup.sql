-- Fictional fixtures for the disposable database only (T4 Stage 1).
-- Account A: two issuing entities, three tenancies. Account B: isolation.
\set QUIET on
insert into auth.users (id, email) values
 ('aaaaaaaa-0000-0000-0000-00000000000a', 't4-a@example.test'),
 ('bbbbbbbb-0000-0000-0000-00000000000b', 't4-b@example.test'),
 ('cccccccc-0000-0000-0000-00000000000c', 't4-manager@example.test'),
 ('dddddddd-0000-0000-0000-00000000000d', 't4-viewer@example.test');
insert into accounts (id, name) values ('a0000000-0000-0000-0000-00000000000a', 'T4 A'), ('b0000000-0000-0000-0000-00000000000b', 'T4 B');
insert into account_members (account_id, user_id, role) values
 ('a0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'owner'),
 ('b0000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-00000000000b', 'owner'),
 ('a0000000-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000c', 'manager'),
 ('a0000000-0000-0000-0000-00000000000a', 'dddddddd-0000-0000-0000-00000000000d', 'viewer');

-- Entities: A-code, SRP-code, and one with no code yet.
insert into llcs (id, account_id, name, display_name, invoice_code, mailing_address, mailing_city, mailing_state, mailing_zip) values
 ('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Example Holdings LLC', 'Example Holdings', 'A', '100 Main St', 'Springfield', 'IL', '62701'),
 ('e2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'Sample Road Properties LLC', null, 'SRP', null, null, null, null),
 ('e3000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 'Placeholder Partners LLC', null, null, null, null, null, null),
 ('eb000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'B Entity LLC', null, 'A', null, null, null, null);

-- Issuer contact details and default payment instructions come from the
-- entity's Branding & documents settings (20261001190000).
insert into entity_document_branding (entity_id, account_id, reply_to_email, payment_instructions, heading_color) values
 ('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'billing@example.test', 'Zelle to billing@example.test', '#1F4E79');

insert into properties (id, account_id, address, billing_entity_id) values
 ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '410 Example Street', 'e1000000-0000-0000-0000-000000000001'),
 ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', '27 Sample Road', 'e2000000-0000-0000-0000-000000000002'),
 ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', '9 Placeholder Lane', null),
 ('b1000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', '1 B Street', 'eb000000-0000-0000-0000-00000000000b');

insert into units (id, account_id, property_id, unit_label, status) values
 ('a4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000001', 'Unit 1', 'Occupied'),
 ('a4000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000001', 'Unit 2', 'Occupied'),
 ('a4000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000002', 'Unit A', 'Occupied'),
 ('a4000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000003', 'Main', 'Occupied'),
 ('b4000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'b1000000-0000-0000-0000-00000000000b', 'Main', 'Occupied');

insert into tenants (id, account_id, name, email, phone) values
 ('a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Riley Example', 'riley@example.test', '(555) 010-1111'),
 ('a3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'Jordan Sample', 'jordan@example.test', null),
 ('a3000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 'Sam Sample', null, '(555) 010-3333'),
 ('a3000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000000a', 'Casey Placeholder', 'casey@example.test', null),
 ('a3000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-00000000000a', 'Morgan Demo', null, null),
 ('b3000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'B Tenant', null, null);

-- L1 full year; L2 starts mid-October (daily prorating), co-tenants;
-- L3 on the SRP property; L4 incomplete (no rent, no terms, no entity).
insert into leases (id, account_id, property_id, unit_id, rent_amount, start_date, end_date) values
 ('a5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 1450, '2026-01-01', '2026-12-31'),
 ('a5000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000002', 1395, '2026-10-15', null),
 ('a5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000003', 1720, '2025-08-01', null),
 ('a5000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000004', null, '2026-06-01', null),
 ('b5000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'b1000000-0000-0000-0000-00000000000b', 'b4000000-0000-0000-0000-00000000000b', 900, '2026-01-01', null);

insert into lease_tenants (account_id, lease_id, tenant_id, is_billing_recipient) values
 ('a0000000-0000-0000-0000-00000000000a', 'a5000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', true),
 ('a0000000-0000-0000-0000-00000000000a', 'a5000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000002', true),
 ('a0000000-0000-0000-0000-00000000000a', 'a5000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003', true),
 ('a0000000-0000-0000-0000-00000000000a', 'a5000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000004', true),
 ('a0000000-0000-0000-0000-00000000000a', 'a5000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000005', false),
 ('b0000000-0000-0000-0000-00000000000b', 'b5000000-0000-0000-0000-00000000000b', 'b3000000-0000-0000-0000-00000000000b', true);

insert into lease_billing_terms (lease_id, account_id, due_day, prorate_rule) values
 ('a5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 1, 'none'),
 ('a5000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 31, 'daily'),
 ('a5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 5, 'none'),
 ('b5000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 1, 'none');

-- One legacy invoice (pre-Stage-1 shape: no lease, no number, issued).
select set_config('app.invoice_op', 'on', false);
insert into invoices (id, account_id, property_id, billed_to, period_start, period_end, amount_due, due_date, state) values
 ('a9000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000001', 'Riley Example', '2026-09-01', '2026-09-30', 1450, '2026-09-01', 'issued');
select set_config('app.invoice_op', 'off', false);

create or replace function t(name text, stmt text, expect text) returns void language plpgsql as $$
begin
  execute stmt;
  if expect = 'ok' then raise notice 'PASS %', name; else raise notice 'FAIL % (expected %, succeeded)', name, expect; end if;
exception when others then
  if expect <> 'ok' and sqlstate = expect then raise notice 'PASS % [%]', name, sqlstate;
  else raise notice 'FAIL % (expected %, got % %)', name, expect, sqlstate, sqlerrm; end if;
end $$;
-- Assert a boolean SQL expression.
create or replace function a(name text, expr text) returns void language plpgsql as $$
declare ok boolean;
begin
  execute 'select (' || expr || ')' into ok;
  if ok then raise notice 'PASS %', name; else raise notice 'FAIL % (false: %)', name, expr; end if;
exception when others then raise notice 'FAIL % (% %)', name, sqlstate, sqlerrm;
end $$;
grant execute on function t(text, text, text), a(text, text) to authenticated;
