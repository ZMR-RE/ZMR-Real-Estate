-- O1-A ownership foundation — federal tax election history for an entity
-- (3B: "retain prior history rather than overwrite"). A row is never
-- rewritten to make a settled election look like it never happened; a
-- genuinely new/different election supersedes an old one by inserting a
-- new row and marking the old one 'superseded', same shape as every
-- other append-preferred table in this schema.
create table llc_tax_elections (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  llc_id uuid not null references llcs(id) on delete cascade,
  -- pick_list_options, list_name = 'tax_election_type' — an open, growing
  -- catalog with no downstream code keying off specific values, unlike
  -- legal_structure/federal_tax_treatment, so this one does follow the
  -- normal pick-list-first convention.
  election_type text not null,
  status text not null default 'unknown'
    check (status in ('unknown', 'no_election_recorded', 'submitted', 'accepted', 'superseded')),
  submitted_date date,
  effective_date date,
  acceptance_date date,
  notes text,
  superseded_by_id uuid references llc_tax_elections(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create index llc_tax_elections_llc_idx on llc_tax_elections (account_id, llc_id, created_at desc);

alter table llc_tax_elections enable row level security;

create policy "members can manage their llc tax elections"
  on llc_tax_elections for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- "Submitted" never auto-becomes "Accepted" — that requires its own
-- explicit application-level action setting status='accepted' plus an
-- acceptance_date. Nothing in this migration enforces that transition
-- rule at the database level (a direct UPDATE could still set both at
-- once); it is an application-layer convention documented here for the
-- query layer to follow, not a DB constraint, since a database check
-- constraint can't express "only via a specific application action."
