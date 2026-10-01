-- T2 entity books, first slice (owner-approved 2026-09-30): each
-- transaction can carry the entity whose books it belongs to.
--
-- * responsible_entity_id is nullable and is ONLY ever set by an explicit
--   user save. No existing row is changed: every current transaction
--   starts unresolved ("Needs entity") until the owner confirms it.
-- * The server never fills it in. suggested_transaction_entity() only
--   PROPOSES the property's sole owner on the transaction date, for the
--   owner to confirm in the form; shared, partial or incompletely dated
--   ownership returns no suggestion. Nothing is allocated from ownership
--   percentages.
-- * property_id stays required in this slice (entity-only expenses are a
--   separate, later step: many consumers assume a property).
-- * Changes are audited by the existing generic financial_transactions
--   audit trigger (log_audit_changes diffs every column).
-- * Re-runnable (IF NOT EXISTS / OR REPLACE): rolling back keeps the column
--   and every confirmed assignment (see the rollback script), so a later
--   re-apply must succeed on a database that still has them.

alter table financial_transactions
  add column if not exists responsible_entity_id uuid
    constraint financial_transactions_responsible_entity_fkey references llcs(id) on delete restrict;

create index if not exists financial_transactions_responsible_entity_idx
  on financial_transactions (account_id, responsible_entity_id);
-- The Needs-entity list: active transactions with no entity confirmed.
create index if not exists financial_transactions_needs_entity_idx
  on financial_transactions (account_id, transaction_date) where responsible_entity_id is null and not voided;

-- Same-workspace check, extended to the new reference (same body as
-- 20260930110000 plus the entity).
create or replace function trg_financial_transactions_same_account()
returns trigger
language plpgsql
as $$
declare
  v_ref_account uuid;
begin
  if auth.uid() is not null and not is_account_member(new.account_id) then
    return new;
  end if;

  select account_id into v_ref_account from properties where id = new.property_id;
  perform assert_same_account(new.account_id, v_ref_account, 'financial_transactions.property_id');

  if new.vendor_id is not null then
    select account_id into v_ref_account from vendors where id = new.vendor_id;
    perform assert_same_account(new.account_id, v_ref_account, 'financial_transactions.vendor_id');
  end if;

  if new.tenant_id is not null then
    select account_id into v_ref_account from tenants where id = new.tenant_id;
    perform assert_same_account(new.account_id, v_ref_account, 'financial_transactions.tenant_id');
  end if;

  if new.prospective_tenant_id is not null then
    select account_id into v_ref_account from prospective_tenants where id = new.prospective_tenant_id;
    perform assert_same_account(new.account_id, v_ref_account, 'financial_transactions.prospective_tenant_id');
  end if;

  if new.responsible_entity_id is not null then
    select account_id into v_ref_account from llcs where id = new.responsible_entity_id;
    perform assert_same_account(new.account_id, v_ref_account, 'financial_transactions.responsible_entity_id');
  end if;

  return new;
end;
$$;

drop trigger if exists financial_transactions_same_account on financial_transactions;
create trigger financial_transactions_same_account
  before insert or update of account_id, property_id, vendor_id, tenant_id, prospective_tenant_id, responsible_entity_id
  on financial_transactions
  for each row
  execute function trg_financial_transactions_same_account();

-- The suggestion: the property's SOLE recorded owner on p_date, or null.
-- An interest covers p_date when effective_date <= p_date (inclusive) and
-- end_date is null or >= p_date. No suggestion when:
--   * no interest covers the date;
--   * more than one entity's interest covers it (shared or changing hands);
--   * any of the property's interests has an unknown effective date and has
--     not ended before p_date (it might cover the date: unclear);
--   * any of the property's interests is no longer current but has no
--     recorded end date (when it ended is unknown: unclear, T3 review);
--   * the sole owner's interest is a known percentage below 100 (the rest
--     of the ownership is unrecorded).
-- Security invoker: the caller's row-level security applies, so another
-- workspace's property yields nothing.
create or replace function suggested_transaction_entity(p_property_id uuid, p_date date)
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  with interests as (
    select llc_id, percentage, effective_date, end_date, is_current
    from property_ownership_interests
    where property_id = p_property_id
      and (end_date is null or end_date >= p_date)
  ),
  covering as (
    select * from interests where effective_date is not null and effective_date <= p_date
  )
  select case
    when p_property_id is null or p_date is null then null
    when exists (select 1 from interests where effective_date is null) then null
    when exists (select 1 from interests where not is_current and end_date is null) then null
    when (select count(distinct llc_id) from covering) <> 1 then null
    when exists (select 1 from covering where percentage is not null and percentage < 100) then null
    else (select llc_id from covering limit 1)
  end
$$;

revoke all on function suggested_transaction_entity(uuid, date) from public, anon;
grant execute on function suggested_transaction_entity(uuid, date) to authenticated;
