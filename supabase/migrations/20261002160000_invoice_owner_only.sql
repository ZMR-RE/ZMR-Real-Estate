-- T4 Stage 1 — owner-only invoicing (owner-approved September 30, 2026).
-- For this release only the portfolio OWNER may change invoices or the
-- settings that feed them. Other members of the account (manager, viewer)
-- keep read access; no invitation or manager/viewer workflow is built.
--
-- "Owner" is read from the existing account_members.role — nothing here
-- creates, changes or backfills a membership.
--
-- Enforced with BEFORE triggers rather than restrictive RLS so a refused
-- update/delete raises a clear error instead of silently touching 0 rows.
-- All invoice actions run as the caller (no security definer), so these
-- triggers cover every path: the dashboard's actions, the assistant run and
-- any direct API write. Error code ZM370.

-- is_account_owner() is defined in 20261001190000; invoice_require_owner()
-- (the ZM370 refusal) in 20261002110000.

create or replace function require_account_owner() returns trigger
language plpgsql set search_path = public as $$
declare acct uuid;
begin
  acct := case when tg_op = 'DELETE' then old.account_id else new.account_id end;
  perform invoice_require_owner(acct);
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- Whole tables that exist only for invoicing. Trigger name sorts first so
-- the ownership message wins over any other guard's message.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'invoices', 'invoice_lines', 'invoice_events', 'document_sequences',
    'lease_billing_terms', 'tenancy_charge_rules', 'tenancy_charge_statements',
    'agents', 'agent_assignments', 'agent_runs'
  ] loop
    execute format(
      'create trigger a0_owner_only before insert or update or delete on %I
         for each row execute function require_account_owner()', tbl);
  end loop;
end $$;

-- Invoicing columns on shared tables: only these columns are owner-only;
-- every other edit to these records is unchanged.
create or replace function require_owner_for_invoicing_columns() returns trigger
language plpgsql set search_path = public as $$
declare changed boolean := false;
begin
  -- Separate branches: PL/pgSQL resolves every field in one expression, and
  -- each table has only its own columns.
  if tg_table_name = 'properties' then
    changed := case when tg_op = 'INSERT' then new.billing_entity_id is not null or new.payment_instructions_override is not null
                    else (new.billing_entity_id, new.payment_instructions_override) is distinct from (old.billing_entity_id, old.payment_instructions_override) end;
  elsif tg_table_name = 'llcs' then
    changed := case when tg_op = 'INSERT' then new.invoice_code is not null
                    else new.invoice_code is distinct from old.invoice_code end;
  elsif tg_table_name = 'lease_tenants' then
    changed := case when tg_op = 'INSERT' then new.is_billing_recipient
                    else new.is_billing_recipient is distinct from old.is_billing_recipient end;
  elsif tg_table_name = 'documents' then
    changed := case when tg_op = 'INSERT' then new.invoice_id is not null
                    else new.invoice_id is distinct from old.invoice_id or old.invoice_id is not null end;
  end if;
  if changed then perform invoice_require_owner(new.account_id); end if;
  return new;
end $$;

create trigger a0_owner_only_invoicing before insert or update on properties
  for each row execute function require_owner_for_invoicing_columns();
create trigger a0_owner_only_invoicing before insert or update on llcs
  for each row execute function require_owner_for_invoicing_columns();
create trigger a0_owner_only_invoicing before insert or update on lease_tenants
  for each row execute function require_owner_for_invoicing_columns();
create trigger a0_owner_only_invoicing before insert or update on documents
  for each row execute function require_owner_for_invoicing_columns();

-- Invoice PDF bytes: only the owner may upload into a property's Invoices
-- folder (restrictive, ANDed with the bucket's existing policies).
create policy "invoice pdfs are uploaded by the owner"
  on storage.objects as restrictive for insert to authenticated
  with check (
    bucket_id <> 'documents'
    or name not like '%/Invoices/%'
    or case when split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
            then public.is_account_owner(split_part(name, '/', 1)::uuid) else false end
  );
