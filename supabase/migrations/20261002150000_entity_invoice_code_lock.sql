-- T4 Stage 1 (Milestone 2, after the 4bd2078 review reference) — once an
-- entity has issued a numbered invoice, its invoice code can't change:
-- otherwise its continuous sequence would silently continue under a
-- different prefix (A-INV-000007 followed by B-INV-000008). Removing a code
-- is refused for the same reason. Before the first issue it stays editable.

create or replace function lock_invoice_code_after_issue() returns trigger language plpgsql set search_path = public as $$
begin
  if new.invoice_code is distinct from old.invoice_code
     and exists (select 1 from invoices where billing_entity_id = old.id and number is not null) then
    raise exception 'This entity has issued numbered invoices; its invoice code can no longer change' using errcode = 'ZM347';
  end if;
  return new;
end $$;

create trigger llcs_invoice_code_lock before update of invoice_code on llcs
  for each row execute function lock_invoice_code_after_issue();
