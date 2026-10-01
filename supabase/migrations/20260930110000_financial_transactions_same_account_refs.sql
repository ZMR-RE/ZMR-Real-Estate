-- M4 (owner-approved manual-bookkeeping package) — tenant-as-payer
-- entry makes financial_transactions.tenant_id a routine, user-chosen
-- reference for the first time (previously only the Quick Capture bridge
-- set it). Foreign keys alone don't check account: RLS hides another
-- account's tenants in the app, but a direct API write could still
-- attach one account's transaction to another account's tenant, vendor,
-- prospective tenant or property. Same assert_same_account() pattern as
-- 20260925070000_cross_account_integrity.sql.
--
-- Fires only when one of these columns is written, so existing rows are
-- not re-validated until they are next edited. No existing row is
-- changed by this migration.

create or replace function trg_financial_transactions_same_account()
returns trigger
language plpgsql
as $$
declare
  v_ref_account uuid;
begin
  -- Same reasoning as the period guard: a caller who isn't a member of
  -- the row's account is rejected by RLS; don't reveal whether another
  -- account's references exist first.
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

  return new;
end;
$$;

drop trigger if exists financial_transactions_same_account on financial_transactions;
create trigger financial_transactions_same_account
  before insert or update of account_id, property_id, vendor_id, tenant_id, prospective_tenant_id on financial_transactions
  for each row
  execute function trg_financial_transactions_same_account();
