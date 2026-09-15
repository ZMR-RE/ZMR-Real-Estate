-- Action Queue unified task/action data model (Roadmap item 10.2).
--
-- property_id and unit_id are both nullable — some actions are
-- account-level (not tied to any property), and not every property-level
-- action is unit-specific. type reuses the 8.1 pick-list system's
-- existing task_type list (tasks.task_type is a plain text column with no
-- check constraint, validated only at the app layer via the picker UI —
-- action_items.type follows the exact same convention). assignee is a
-- user for now ("or, later, an agent" per the roadmap item's own
-- wording) — a plain auth.users FK, nothing agent-specific added
-- speculatively.
--
-- due_date/recurrence match tasks' existing shape exactly (same default,
-- same check constraint) so 2.2's Task Engine could point at this table
-- later with no field-shape changes needed if/when it's consolidated in.
--
-- Consolidating existing Tasks (2.2) data/UI into this table is
-- deliberately NOT done in this migration — see the roadmap 10.2 note
-- for why (data migration of live rows + rewriting Task Engine's 6
-- files + dropping the old table afterward is a separate, larger,
-- explicitly-approved step, not something to fold in here).
create table action_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  unit_id uuid references units(id) on delete cascade,
  type text,
  title text not null,
  notes text,
  assignee uuid references auth.users(id),
  due_date date not null default current_date,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'weekly', 'monthly', 'quarterly', 'yearly')),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index action_items_account_property_idx on action_items (account_id, property_id);
create index action_items_account_due_date_idx on action_items (account_id, due_date);

alter table action_items enable row level security;

create policy "members can manage their action items"
  on action_items for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
