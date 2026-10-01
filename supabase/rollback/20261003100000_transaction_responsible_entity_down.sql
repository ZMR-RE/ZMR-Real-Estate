-- Rollback for 20261003100000_transaction_responsible_entity.
-- WARNING: dropping the column discards every confirmed entity choice.
-- Before running it on a database where entities have been confirmed,
-- export them (the first query) so they can be restored.
--
--   select id, responsible_entity_id from financial_transactions where responsible_entity_id is not null;

begin;

drop function if exists suggested_transaction_entity(uuid, date);

-- Restore the same-workspace check exactly as 20260930110000 defined it.
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

  return new;
end;
$$;

drop trigger if exists financial_transactions_same_account on financial_transactions;
create trigger financial_transactions_same_account
  before insert or update of account_id, property_id, vendor_id, tenant_id, prospective_tenant_id on financial_transactions
  for each row
  execute function trg_financial_transactions_same_account();

drop index if exists financial_transactions_needs_entity_idx;
drop index if exists financial_transactions_responsible_entity_idx;
alter table financial_transactions drop column if exists responsible_entity_id;

commit;
