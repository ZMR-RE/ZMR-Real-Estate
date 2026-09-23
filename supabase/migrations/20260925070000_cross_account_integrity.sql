-- O1-A ownership foundation — cross-account reference integrity (I3/I5,
-- and CLAUDE.md's Data safety rule: "every table and query touching
-- user/tenant data must enforce account_id row-level security scoping,
-- no exceptions").
--
-- Gap this closes: neither properties.llc_id -> llcs.id nor
-- llcs.holding_company_id -> holding_companies.id has ever verified the
-- referenced row shares the same account_id — the bare foreign key only
-- guarantees the row exists somewhere, not that it belongs to the
-- caller's own account. In practice the UI can't select a foreign-account
-- id (every picker is fetched pre-scoped by account_id), but a direct API
-- call could still set one. This is a pre-existing gap, not something
-- introduced by this batch, and this migration only ADDS a guard — it
-- does not change any approved product behavior.
--
-- Required read-only pre-check, actually run before writing this
-- constraint (not skipped, and not "silently repaired" if anything had
-- been found): against a nonproduction copy seeded from
-- 20260903192431_seed_zmr_account.sql / 20260904180522_seed_properties.sql,
--
--   select p.id from properties p join llcs l on l.id = p.llc_id
--   where p.account_id <> l.account_id;
--
--   select l.id from llcs l join holding_companies h on h.id = l.holding_company_id
--   where l.account_id <> h.account_id;
--
-- both returned zero rows. This does NOT constitute a check of the actual
-- hosted production database, which this session has no credentialed
-- access to — whoever applies this migration to the real project must run
-- both queries against it first and report any row found (by id) rather
-- than let this constraint's `before` trigger start rejecting an existing
-- record's next unrelated edit. If either query finds a real violating
-- row, this migration must not be applied until that specific row is
-- resolved — never silently deleted, nulled, or reassigned by a
-- migration.
create or replace function assert_same_account(p_account_id uuid, p_ref_account_id uuid, p_context text)
returns void
language plpgsql
as $$
begin
  if p_ref_account_id is distinct from p_account_id then
    raise exception 'cross-account reference rejected (%)', p_context using errcode = 'ZM002';
  end if;
end;
$$;

create or replace function trg_properties_llc_same_account()
returns trigger
language plpgsql
as $$
declare
  v_llc_account uuid;
begin
  if new.llc_id is not null then
    select account_id into v_llc_account from llcs where id = new.llc_id;
    perform assert_same_account(new.account_id, v_llc_account, 'properties.llc_id');
  end if;
  return new;
end;
$$;

create trigger properties_llc_same_account
  before insert or update of llc_id, account_id on properties
  for each row
  execute function trg_properties_llc_same_account();

create or replace function trg_llcs_holding_company_same_account()
returns trigger
language plpgsql
as $$
declare
  v_holding_account uuid;
begin
  if new.holding_company_id is not null then
    select account_id into v_holding_account from holding_companies where id = new.holding_company_id;
    perform assert_same_account(new.account_id, v_holding_account, 'llcs.holding_company_id');
  end if;
  return new;
end;
$$;

create trigger llcs_holding_company_same_account
  before insert or update of holding_company_id, account_id on llcs
  for each row
  execute function trg_llcs_holding_company_same_account();

-- Every new relationship this batch introduces gets the same guard,
-- checked inside the SECURITY DEFINER functions themselves (see
-- 20260925060000_ownership_interest_functions.sql, which already
-- verifies every owner_id/member_id belongs to the calling account before
-- writing) for property_ownership_interests and llc_membership_interests.
-- The remaining new tables get a trigger here, same pattern as above,
-- since they are written directly (through RLS-gated inserts, not a
-- SECURITY DEFINER function) rather than through a validating function:
create or replace function trg_contact_links_same_account()
returns trigger
language plpgsql
as $$
declare
  v_contact_account uuid;
  v_property_account uuid;
  v_llc_account uuid;
begin
  select account_id into v_contact_account from contacts where id = new.contact_id;
  perform assert_same_account(new.account_id, v_contact_account, 'contact_links.contact_id');

  if new.property_id is not null then
    select account_id into v_property_account from properties where id = new.property_id;
    perform assert_same_account(new.account_id, v_property_account, 'contact_links.property_id');
  end if;

  if new.llc_id is not null then
    select account_id into v_llc_account from llcs where id = new.llc_id;
    perform assert_same_account(new.account_id, v_llc_account, 'contact_links.llc_id');
  end if;

  return new;
end;
$$;

create trigger contact_links_same_account
  before insert or update on contact_links
  for each row
  execute function trg_contact_links_same_account();

create or replace function trg_contact_methods_same_account()
returns trigger
language plpgsql
as $$
declare
  v_contact_account uuid;
begin
  select account_id into v_contact_account from contacts where id = new.contact_id;
  perform assert_same_account(new.account_id, v_contact_account, 'contact_methods.contact_id');
  return new;
end;
$$;

create trigger contact_methods_same_account
  before insert or update on contact_methods
  for each row
  execute function trg_contact_methods_same_account();

create or replace function trg_document_owner_links_same_account()
returns trigger
language plpgsql
as $$
declare
  v_document_account uuid;
  v_llc_account uuid;
begin
  select account_id into v_document_account from documents where id = new.document_id;
  perform assert_same_account(new.account_id, v_document_account, 'document_owner_links.document_id');

  select account_id into v_llc_account from llcs where id = new.llc_id;
  perform assert_same_account(new.account_id, v_llc_account, 'document_owner_links.llc_id');

  return new;
end;
$$;

create trigger document_owner_links_same_account
  before insert or update on document_owner_links
  for each row
  execute function trg_document_owner_links_same_account();
