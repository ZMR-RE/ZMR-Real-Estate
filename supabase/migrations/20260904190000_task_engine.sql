-- Task Engine (Roadmap item 2.2) — per-property to-do lists, recurring
-- items, and a "coming up" view across the portfolio.
--
-- Recurrence is handled by roll-forward, not a cron/schedule: when a
-- recurring task is marked complete, the app inserts the next occurrence
-- with a computed due_date (see src/modules/tasks/useTaskEngine.ts). That
-- keeps this table a plain list of concrete due dates — no separate
-- "recurrence rule" table to reconcile against actual occurrences.
create table tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  title text not null,
  notes text,
  due_date date not null default current_date,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'weekly', 'monthly', 'quarterly', 'yearly')),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tasks enable row level security;

create policy "members can manage their tasks"
  on tasks for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
