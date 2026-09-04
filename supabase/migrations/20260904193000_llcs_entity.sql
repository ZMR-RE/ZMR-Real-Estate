-- Restructure LLC as its own entity rather than a free-text field on
-- properties. This lets an LLC's own details (EIN, formation state,
-- registered agent, annual report due date) live in one place, be edited
-- independently of any single property, and eventually be shared across
-- properties held under the same LLC. Fields beyond name are optional —
-- we don't have that data yet, so nothing here should be required.
create table llcs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  ein text,
  formation_state text,
  registered_agent text,
  annual_report_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table llcs enable row level security;

create policy "members can manage their llcs"
  on llcs for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

alter table properties add column llc_id uuid references llcs(id) on delete restrict;

-- Migrate existing free-text llc_name values into real llc rows (one per
-- distinct account_id + name), then point each property at its new row.
-- Generic over whatever properties/llc_names exist at migration time,
-- rather than hardcoding the two known today.
do $$
declare
  r record;
  v_llc_id uuid;
begin
  for r in
    select distinct account_id, llc_name
    from properties
    where llc_name is not null
  loop
    insert into llcs (account_id, name)
    values (r.account_id, r.llc_name)
    returning id into v_llc_id;

    update properties
    set llc_id = v_llc_id
    where account_id = r.account_id and llc_name = r.llc_name;
  end loop;
end $$;

alter table properties drop column llc_name;
