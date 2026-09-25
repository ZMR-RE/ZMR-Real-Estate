-- Package 1 readiness gap, corrected after checking the LIVE Practice
-- database directly (not just reading migration files in order):
--
-- 1) contacts/contact_methods/contact_links already have UPDATE-only
--    audit coverage (20260925030000_contacts.sql), and that file's own
--    comment already documents the exact gap this migration closes:
--    "Creating a new contact, method, or link is not itself
--    audit-logged." This migration adds INSERT coverage — it does not
--    duplicate the existing UPDATE triggers (an earlier draft of this
--    migration tried to recreate them and failed with "trigger already
--    exists," which is what caught this).
--
-- 2) While tracing that, found a real, separate, already-shipped
--    regression: 20260925030000_contacts.sql's own
--    `audit_log_table_name_check` rewrite dropped 'financial_transactions'
--    and 'financial_periods' from the allowed list — both added by
--    earlier migrations (20260911100000, 20260911110000) — instead of
--    extending it. Confirmed directly against the live Practice
--    database's actual constraint definition: neither value is present
--    today. The financial_transactions_audit_log and
--    financial_periods_audit_log triggers were never dropped and still
--    fire on every transaction edit/void and every period lock/reopen —
--    each of those UPDATEs now hits this CHECK constraint inside the
--    same transaction and fails outright, which means the edit/void/
--    lock/reopen itself has been failing, not just its audit row. This
--    predates Package 1 and this handoff; fixed here because this
--    migration already has to touch this exact constraint, not folded
--    silently into "audit coverage" — flagged separately to the owner
--    given the severity. Restoring the full, correct list (not
--    replacing it again) is the fix.
alter table audit_log drop constraint audit_log_table_name_check;
alter table audit_log add constraint audit_log_table_name_check
  check (table_name in ('properties', 'llcs', 'mortgage_details', 'financial_transactions', 'financial_periods', 'contacts', 'contact_methods', 'contact_links'));

-- Generalizes the existing log_audit_changes() function (not a second,
-- parallel function) to also handle TG_OP = 'insert': every non-null
-- column is logged as changed from null, using the same
-- account_id/table_name/record_id/field_name/old_value/new_value/
-- changed_by/source shape the update path already writes. The four
-- pre-existing `after update`-only triggers (properties, llcs,
-- mortgage_details, financial_transactions) are untouched by this
-- migration, so TG_OP is always 'UPDATE' for them — the new INSERT
-- branch is inert there; their behavior does not change.
create or replace function log_audit_changes()
returns trigger
language plpgsql
as $$
declare
  -- OLD does not exist for an INSERT-triggered call (referencing it
  -- would error), so it's only ever read inside the TG_OP = 'UPDATE'
  -- branch below, never at the top of the function.
  new_data jsonb := to_jsonb(new);
  skip_cols text[] := array['id', 'account_id', 'created_at', 'updated_at', 'property_id'];
  changed_field text;
  v_source text;
begin
  if auth.uid() is null then
    v_source := 'service';
  elsif exists (
    select 1 from account_members
    where user_id = auth.uid() and account_id = new.account_id and is_test_actor
  ) then
    v_source := 'test';
  else
    v_source := 'user';
  end if;

  if TG_OP = 'INSERT' then
    for changed_field in select jsonb_object_keys(new_data)
    loop
      if changed_field = any(skip_cols) or new_data->>changed_field is null then
        continue;
      end if;

      insert into audit_log (account_id, table_name, record_id, field_name, old_value, new_value, changed_by, source)
      values (new.account_id, TG_TABLE_NAME, new.id, changed_field, null, new_data->>changed_field, auth.uid(), v_source);
    end loop;
  else
    declare
      old_data jsonb := to_jsonb(old);
    begin
      for changed_field in select jsonb_object_keys(new_data)
      loop
        if changed_field = any(skip_cols) then
          continue;
        end if;

        if old_data->changed_field is distinct from new_data->changed_field then
          insert into audit_log (account_id, table_name, record_id, field_name, old_value, new_value, changed_by, source)
          values (
            new.account_id,
            TG_TABLE_NAME,
            new.id,
            changed_field,
            old_data->>changed_field,
            new_data->>changed_field,
            auth.uid(),
            v_source
          );
        end if;
      end loop;
    end;
  end if;

  return new;
end;
$$;

-- Extend the three existing UPDATE-only triggers to also fire on
-- INSERT, rather than adding a second, parallel trigger per table —
-- `drop`+`create` under the same names since Postgres has no
-- `alter trigger ... add event`.
drop trigger contacts_audit_log on contacts;
create trigger contacts_audit_log
  after insert or update on contacts
  for each row
  execute function log_audit_changes();

drop trigger contact_methods_audit_log on contact_methods;
create trigger contact_methods_audit_log
  after insert on contact_methods
  for each row
  execute function log_audit_changes();
-- contact_methods has no updated_at column (create-once; edits happen
-- as delete+recreate per its own migration's comment), so insert-only
-- coverage, not insert-or-update, is the complete fix here.

drop trigger contact_links_audit_log on contact_links;
create trigger contact_links_audit_log
  after insert on contact_links
  for each row
  execute function log_audit_changes();
-- Same reasoning as contact_methods — no updated_at column.
