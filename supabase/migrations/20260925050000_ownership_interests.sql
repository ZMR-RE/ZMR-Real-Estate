-- O1-A ownership foundation — multiple property owners and entity members,
-- each with an optional percentage, with effective-dated history
-- preserved rather than overwritten (Batch G1, revised I1/I2/I3).
--
-- Design notes (see the implementation contract v3.0 section 2 for the
-- full rationale):
--
-- * A row represents an interest that was/is true for a period of time.
--   `is_current` marks the interest presently in effect; ending one
--   (removal, or superseding it with a changed percentage) never deletes
--   or rewrites the old row's own facts — it sets end_date/is_current and,
--   for a percentage change, points superseded_by_id at the replacement
--   row. This is the same "insert a new row, mark the old one settled,
--   never rewrite it" shape llc_tax_elections already uses.
-- * effective_date is separate from recorded_at: effective_date is when
--   the interest is/was legally true (nullable — an unknown historic date
--   is recorded as unknown, never guessed), recorded_at is when this
--   system learned about it. The two are never conflated.
-- * A partial unique index enforces exactly one CURRENT row per
--   (property_id, llc_id) pair while allowing unlimited historical rows
--   for the same pair over time.
-- * There is deliberately no INSERT/UPDATE/DELETE policy for the
--   `authenticated` role on either interest table below — every write
--   goes through the security-definer functions in the next migration,
--   which validate the aggregate (percentages positive/<=100, known
--   percentages never exceeding 100, a fully-known allocation summing to
--   exactly 100) and log a reason, atomically, for the property/entity's
--   whole ownership set in one transaction. This is what makes "no bypass
--   that avoids the correction/reason requirement" a database-enforced
--   fact, not just an application convention that a future caller could
--   forget. Per-account read access is still plain RLS, same as
--   everywhere else in this schema.
create table property_ownership_interests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  llc_id uuid not null references llcs(id) on delete restrict,
  percentage numeric(5,2) check (percentage is null or (percentage > 0 and percentage <= 100)),
  effective_date date,
  end_date date,
  is_current boolean not null default true,
  superseded_by_id uuid references property_ownership_interests(id) on delete set null,
  notes text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id),
  constraint property_ownership_interests_dates_check
    check (end_date is null or effective_date is null or end_date >= effective_date)
);

create unique index property_ownership_interests_current_unique
  on property_ownership_interests (property_id, llc_id) where is_current;
create index property_ownership_interests_property_idx
  on property_ownership_interests (account_id, property_id, is_current);
create index property_ownership_interests_llc_idx
  on property_ownership_interests (account_id, llc_id, is_current);

alter table property_ownership_interests enable row level security;
create policy "members can view their property ownership interests"
  on property_ownership_interests for select
  using (is_account_member(account_id));

-- Entity membership interests — the parallel structure for "who is a
-- member of this entity, and what share" (e.g. "Entity C: 50% Owner A /
-- 50% Owner C"), kept as a wholly separate table from property title per
-- the explicit instruction to separate the two: an entity's membership
-- roster and a property's title ownership are different facts that must
-- never be conflated or derived from one another.
create table llc_membership_interests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  llc_id uuid not null references llcs(id) on delete cascade,
  member_llc_id uuid not null references llcs(id) on delete restrict,
  percentage numeric(5,2) check (percentage is null or (percentage > 0 and percentage <= 100)),
  effective_date date,
  end_date date,
  is_current boolean not null default true,
  superseded_by_id uuid references llc_membership_interests(id) on delete set null,
  notes text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id),
  constraint llc_membership_interests_dates_check
    check (end_date is null or effective_date is null or end_date >= effective_date),
  constraint llc_membership_interests_not_self check (llc_id <> member_llc_id)
);

create unique index llc_membership_interests_current_unique
  on llc_membership_interests (llc_id, member_llc_id) where is_current;
create index llc_membership_interests_llc_idx
  on llc_membership_interests (account_id, llc_id, is_current);
create index llc_membership_interests_member_idx
  on llc_membership_interests (account_id, member_llc_id, is_current);

alter table llc_membership_interests enable row level security;
create policy "members can view their llc membership interests"
  on llc_membership_interests for select
  using (is_account_member(account_id));

-- Version counters for optimistic-concurrency protection (I5: protect
-- against stale overwrites). One row per property/entity, incremented by
-- the mutation functions on every successful write; a caller passes the
-- version it last read and the function rejects a write against a stale
-- version rather than silently overwriting a newer one. Kept as their own
-- tiny tables rather than a column on properties/llcs, so this migration
-- never touches either of those already-shipped tables' schemas.
create table property_ownership_versions (
  property_id uuid primary key references properties(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  version bigint not null default 0
);
alter table property_ownership_versions enable row level security;
create policy "members can view their property ownership versions"
  on property_ownership_versions for select using (is_account_member(account_id));

create table llc_membership_versions (
  llc_id uuid primary key references llcs(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  version bigint not null default 0
);
alter table llc_membership_versions enable row level security;
create policy "members can view their llc membership versions"
  on llc_membership_versions for select using (is_account_member(account_id));

-- Correction/change log — both property title and entity membership
-- changes get one, per I4 ("property ownership and entity membership
-- corrections require consistent reason/history across every entry
-- route"). `reason` is required at the database level (not null, no
-- default) so this table can never silently receive a reasonless row even
-- if a future caller tried.
create table property_ownership_corrections (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  llc_id uuid not null references llcs(id) on delete restrict,
  interest_id uuid references property_ownership_interests(id) on delete set null,
  change_type text not null check (change_type in ('added', 'removed', 'percentage_changed')),
  previous_percentage numeric(5,2),
  new_percentage numeric(5,2),
  reason text not null check (btrim(reason) <> ''),
  corrected_by uuid references auth.users(id),
  corrected_at timestamptz not null default now()
);
create index property_ownership_corrections_property_idx
  on property_ownership_corrections (account_id, property_id, corrected_at desc);
alter table property_ownership_corrections enable row level security;
create policy "members can view their property ownership corrections"
  on property_ownership_corrections for select using (is_account_member(account_id));

create table llc_membership_corrections (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  llc_id uuid not null references llcs(id) on delete cascade,
  member_llc_id uuid not null references llcs(id) on delete restrict,
  interest_id uuid references llc_membership_interests(id) on delete set null,
  change_type text not null check (change_type in ('added', 'removed', 'percentage_changed')),
  previous_percentage numeric(5,2),
  new_percentage numeric(5,2),
  reason text not null check (btrim(reason) <> ''),
  corrected_by uuid references auth.users(id),
  corrected_at timestamptz not null default now()
);
create index llc_membership_corrections_llc_idx
  on llc_membership_corrections (account_id, llc_id, corrected_at desc);
alter table llc_membership_corrections enable row level security;
create policy "members can view their llc membership corrections"
  on llc_membership_corrections for select using (is_account_member(account_id));

-- Read-only "current owner, if unambiguous" bridge for legacy single-owner
-- consumers (I3: "specify safe legacy-pointer behavior, distinguish
-- unresolved owners from multiple owners, and avoid two independently
-- writable sources of truth"). Deliberately a VIEW, not a second stored
-- column: properties.llc_id is not written by anything in this batch,
-- so there is exactly one writable source of truth for title ownership
-- (property_ownership_interests, via the functions in the next
-- migration). A consumer that structurally needs a single value (e.g.
-- today's financial-account picker scoping) reads this view, which
-- returns a real llc_id only when there is exactly one current interest,
-- and null both when there are zero (unresolved — same meaning
-- properties.llc_id IS NULL already has today) and when there are two or
-- more (genuinely multi-owner — never arbitrarily picks one). Migrating
-- the actual UI/query consumers to read this instead of the raw
-- properties.llc_id column is separate, later wiring work, not performed
-- by this migration.
create view property_current_owner as
select
  p.id as property_id,
  p.account_id,
  (array_agg(poi.llc_id) filter (where poi.is_current))[1] as llc_id,
  count(*) filter (where poi.is_current) as current_owner_count
from properties p
left join property_ownership_interests poi on poi.property_id = p.id and poi.is_current
where is_account_member(p.account_id)
group by p.id, p.account_id
having count(*) filter (where poi.is_current) <= 1;

-- Ownership-completeness summary, computed rather than stored, so it can
-- never drift from the interests it summarizes (I1: "explicit
-- completeness state" — shown to the user, not silently inferred
-- elsewhere; "no inferred remainder or equal shares" — this view never
-- fills in a missing percentage, it only reports what is/isn't known).
create view property_ownership_summary as
select
  p.id as property_id,
  p.account_id,
  count(*) filter (where poi.is_current) as owner_count,
  count(*) filter (where poi.is_current and poi.percentage is not null) as owners_with_percentage,
  sum(poi.percentage) filter (where poi.is_current) as percentage_total,
  case
    when count(*) filter (where poi.is_current) = 0 then 'none'
    when count(*) filter (where poi.is_current and poi.percentage is null) > 0 then 'partial'
    when sum(poi.percentage) filter (where poi.is_current) = 100 then 'complete'
    else 'partial'
  end as completeness
from properties p
left join property_ownership_interests poi on poi.property_id = p.id
where is_account_member(p.account_id)
group by p.id, p.account_id;
