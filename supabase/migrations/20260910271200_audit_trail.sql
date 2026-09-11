-- ZMR Real Estate — Basic audit trail (Roadmap item 7.8)
-- Tracks who changed which field, old value, new value, and when, on
-- Property, LLC, and Mortgage records. A single generic trigger function
-- attached to all three tables, rather than three bespoke ones, so any
-- future column added to properties/llcs/mortgage_details is covered
-- automatically without touching this migration again.

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  table_name text not null check (table_name in ('properties', 'llcs', 'mortgage_details')),
  record_id uuid not null,
  field_name text not null,
  old_value text,
  new_value text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index audit_log_record_idx on audit_log (table_name, record_id, changed_at desc);

alter table audit_log enable row level security;

-- Read-only from the client's perspective — rows are written exclusively
-- by the trigger below (running as the editing user, so this insert
-- policy still has to allow it). No update/delete policy at all: audit
-- rows are immutable once written.
create policy "members can view their audit log"
  on audit_log for select
  using (is_account_member(account_id));

create policy "members can insert their audit log"
  on audit_log for insert
  with check (is_account_member(account_id));

create or replace function log_audit_changes()
returns trigger
language plpgsql
as $$
declare
  old_data jsonb := to_jsonb(old);
  new_data jsonb := to_jsonb(new);
  skip_cols text[] := array['id', 'account_id', 'created_at', 'updated_at', 'property_id'];
  changed_field text;
begin
  for changed_field in select jsonb_object_keys(new_data)
  loop
    if changed_field = any(skip_cols) then
      continue;
    end if;

    if old_data->changed_field is distinct from new_data->changed_field then
      insert into audit_log (account_id, table_name, record_id, field_name, old_value, new_value, changed_by)
      values (
        new.account_id,
        TG_TABLE_NAME,
        new.id,
        changed_field,
        old_data->>changed_field,
        new_data->>changed_field,
        auth.uid()
      );
    end if;
  end loop;

  return new;
end;
$$;

create trigger properties_audit_log
  after update on properties
  for each row
  execute function log_audit_changes();

create trigger llcs_audit_log
  after update on llcs
  for each row
  execute function log_audit_changes();

create trigger mortgage_details_audit_log
  after update on mortgage_details
  for each row
  execute function log_audit_changes();

-- Resolves changed_by (an auth.users id, not directly selectable by
-- clients) to an email address for display, scoped to members of the
-- caller's own account(s). Views execute with the privileges of their
-- owner (the migration role, which can read auth.users), so this is the
-- one place client code is allowed to see any part of auth.users, and
-- only the email of people who share an account with the caller.
create view account_member_directory as
select am.account_id, am.user_id, u.email
from account_members am
join auth.users u on u.id = am.user_id
where is_account_member(am.account_id);

grant select on account_member_directory to authenticated;
