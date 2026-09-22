-- Distinguish terminal-driven test edits from the user's own real edits
-- in the audit trail (7.8). Both currently log under the same
-- auth.uid()/email, since terminals doing live-dashboard verification
-- authenticate as the same real user session per CLAUDE.md's "test
-- through the live dashboard UI" rule — there's no second identity
-- anywhere in the request for the existing trigger to key off.
--
-- Fix: a real second identity (a reserved test-verification login,
-- provisioned separately, never used by the account owner), marked via
-- a new is_test_actor flag on that one account_members row. audit_log
-- gets a new `source` column, derived entirely server-side inside the
-- existing log_audit_changes() trigger — no client cooperation
-- required, so it can't be forgotten or spoofed by app code the way a
-- self-reported flag could.
--
-- source values:
--   'user'    — a real, non-test account member (auth.uid() resolves,
--               is_test_actor is false)
--   'test'    — the designated test-verification identity
--               (auth.uid() resolves, is_test_actor is true)
--   'service' — no authenticated user in the request at all (auth.uid()
--               is null) — a raw SQL/service-role connection, e.g. the
--               Supabase CLI's `db query`, bypassing PostgREST/Auth
--               entirely. This case already existed before this
--               migration (3 pre-existing audit_log rows have
--               changed_by null); it's now labeled instead of silently
--               unlabeled.
--
-- Existing rows are backfilled to 'user' by the column default — the
-- 84 pre-existing ambiguous rows stay ambiguous (all genuinely could be
-- either the real user or a terminal reusing their session; there's no
-- way to tell them apart retroactively), not manually re-annotated.
alter table account_members add column is_test_actor boolean not null default false;

alter table audit_log add column source text not null default 'user'
  check (source in ('user', 'test', 'service'));

create or replace function log_audit_changes()
returns trigger
language plpgsql
as $$
declare
  old_data jsonb := to_jsonb(old);
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

  return new;
end;
$$;
-- Existing triggers (properties_audit_log, llcs_audit_log,
-- mortgage_details_audit_log, financial_transactions_audit_log) all
-- reference this function by name, so `create or replace function`
-- above updates their behavior with no need to touch the triggers
-- themselves.
