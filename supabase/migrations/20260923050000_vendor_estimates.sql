-- Roadmap 8.11(b) — the estimate-comparison workflow: log multiple
-- vendor quotes for one job, which one was chosen and why, tracked by
-- date. Two tables, not an extension of action_items: this stays
-- narrow/single-purpose (chosen_estimate_id/decision_notes only mean
-- something for an estimate job, not every action item) and doesn't
-- force every comparison to require a task to exist first — same
-- "specialized concept gets its own table, links back optionally"
-- shape already used for Property Tax Installments, Security Deposits,
-- Mortgage Details rather than bolting narrow fields onto a generic
-- table. action_item_id is a genuinely optional cross-reference, not a
-- required anchor.
--
-- estimate_jobs.chosen_estimate_id and vendor_estimates.job_id
-- reference each other's tables, so vendor_estimates is created first
-- and estimate_jobs.chosen_estimate_id is added via a second ALTER
-- once vendor_estimates exists. "Status" (Open vs. Decided) is
-- deliberately NOT a stored column — derived in the app from whether
-- chosen_estimate_id is set, so there's no second field that could
-- drift out of sync with it.
create table estimate_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  title text not null,
  -- Optional cross-reference to an existing Action Queue task — never
  -- required; a job can exist standalone (e.g. quotes gathered before
  -- this feature existed, or a comparison that never became a task).
  action_item_id uuid references action_items(id) on delete set null,
  decision_notes text,
  decided_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vendor_estimates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  job_id uuid not null references estimate_jobs(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  estimate_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Added now that vendor_estimates exists. Integrity note: nothing at
-- the DB level stops this from pointing at a vendor_estimates row that
-- belongs to a *different* job — trusted to the app layer (which only
-- ever offers a job's own estimates as choices for it), matching this
-- schema's existing convention for similar cross-table business rules
-- (e.g. capture_log's receipt_type/category pairing) rather than a
-- trigger for a single-writer internal tool.
alter table estimate_jobs add column chosen_estimate_id uuid references vendor_estimates(id) on delete set null;

create index estimate_jobs_account_property_idx on estimate_jobs (account_id, property_id);
create index vendor_estimates_job_idx on vendor_estimates (job_id);

alter table estimate_jobs enable row level security;
alter table vendor_estimates enable row level security;

create policy "members can manage their estimate jobs"
  on estimate_jobs for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy "members can manage their vendor estimates"
  on vendor_estimates for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
