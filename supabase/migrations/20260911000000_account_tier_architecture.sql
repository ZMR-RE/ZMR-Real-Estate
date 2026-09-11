-- ZMR Real Estate — Tier architecture, reserved now (Roadmap item 8.10)
-- Pure architecture, no enforcement: a `tier` field on accounts, and a
-- table naming which feature key requires which minimum tier. Nothing
-- reads either yet — tier definitions and actual enforcement are
-- explicitly Phase 5 work (billing/subscription). Deliberately no check
-- constraint on either tier column: the real tier catalog (e.g.
-- free/standard/pro) is a product decision Phase 5 owns, not something
-- to guess at here.
--
-- Roadmap 8.9 (multi-user role-based access architecture) needs no new
-- schema — account_members (see 20260903173528_initial_schema.sql)
-- already is a users-to-account many-to-many table with a role field
-- (owner/manager/viewer), unused by any permission check today. That
-- already satisfies "architecture reserved now."
alter table accounts add column tier text not null default 'standard';

-- Global feature/tier catalog — not account-scoped, so no account_id
-- and no is_account_member() policy; this is platform config (which
-- feature key requires which tier), not tenant data. Starts empty: no
-- feature is flagged as tier-gated until Phase 5 actually decides that.
create table feature_tier_requirements (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  required_tier text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table feature_tier_requirements enable row level security;

-- Read-only from the client today — nothing writes here until Phase 5
-- builds the tier definitions and an admin surface to manage them.
create policy "authenticated users can read feature tier requirements"
  on feature_tier_requirements for select
  to authenticated
  using (true);
