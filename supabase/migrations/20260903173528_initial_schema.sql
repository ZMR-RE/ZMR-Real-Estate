-- ZMR Real Estate — Core Schema (Roadmap item 0.3)
-- Multi-tenant foundation: every table below is scoped to account_id and
-- protected by row-level security. This is what Phase 1 (Registry, Capture
-- Inbox) and everything after it builds on top of.

-- ============================================================
-- ACCOUNTS — one row per tenant. "ZMR Real Estate" is account #1.
-- ============================================================
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ACCOUNT_MEMBERS — maps Supabase auth users to accounts + role.
-- This is what lets a future customer's login only ever see their
-- own account's data, and what lets you add team members later.
-- ============================================================
create table account_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'manager', 'viewer')),
  created_at timestamptz not null default now(),
  unique (account_id, user_id)
);

-- ============================================================
-- PROPERTIES — the Property Registry (item 1.2)
-- lease_terms and utilities are jsonb for now — flexible on purpose,
-- since the exact fields aren't finalized yet. Worth converting to
-- normalized columns later once the Registry UI settles the real
-- field list; not worth guessing that structure today.
-- ============================================================
create table properties (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,                  -- e.g. "5336 W Foster Ave"
  llc_name text,                       -- e.g. "5336 W Foster LLC"
  address text,
  city text,
  state text,
  zip text,
  unit_config text,                    -- free text for now (beds/baths/etc.)
  lease_terms jsonb,
  utilities jsonb,
  insurance_provider text,
  insurance_policy_number text,
  contact_email text,                  -- the property's dedicated email (Phase 3 hook)
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CAPTURE_LOG — Quick Capture Inbox (item 1.3)
-- attachment_path = staged file location in Supabase Storage.
-- drive_file_url gets filled in once item 2.6 (reconcile-to-Drive
-- move) is built — null until then, that's expected.
-- ============================================================
create table capture_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete restrict,
  captured_by uuid references auth.users(id),
  entry_type text not null check (entry_type in ('receipt', 'visit', 'communication')),
  entry_date date not null default current_date,
  notes text,
  attachment_path text,
  attachment_type text check (attachment_type in ('photo', 'pdf')),
  drive_file_url text,
  reconciled boolean not null default false,
  reconciled_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — enforced per CLAUDE.md data safety rule.
-- No table above is readable or writable outside its own account.
-- ============================================================
alter table accounts enable row level security;
alter table account_members enable row level security;
alter table properties enable row level security;
alter table capture_log enable row level security;

-- Helper: is the current logged-in user a member of this account?
create or replace function is_account_member(target_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from account_members
    where account_id = target_account_id
    and user_id = auth.uid()
  );
$$;

create policy "members can view their account"
  on accounts for select
  using (is_account_member(id));

create policy "members can view their memberships"
  on account_members for select
  using (is_account_member(account_id));

create policy "members can manage their properties"
  on properties for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy "members can manage their capture log"
  on capture_log for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
