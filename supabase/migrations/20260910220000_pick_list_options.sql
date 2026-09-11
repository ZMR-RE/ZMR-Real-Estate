-- Generic Configurable Pick-Lists (Roadmap item 8.1)
--
-- One table backs every account-scoped, user-editable dropdown in the
-- app. list_name identifies which dropdown a row belongs to. Archiving
-- (active = false) is the only removal path — per CLAUDE.md's soft-
-- delete rule, an archived option must stop being selectable in new
-- entries but never breaks a historical record: those records store the
-- plain text value directly (not a foreign key to this table), so
-- archiving a row here never touches data that already references it.
--
-- Applied to four fields (8.1's list): financial_transactions.subcategory,
-- financial_transactions.payment_method, documents.category (document
-- type), and the new tasks.task_type. financial_transactions.category
-- (the top-level Income/Expense category) is intentionally NOT included —
-- it stays the fixed Schedule-E-aligned enum, since
-- financial_transactions_category_matches_type and
-- 20260910210000_chart_of_accounts.sql's category_account_mappings both
-- key off those exact fixed values; turning it into a freely add/archive
-- list would let a user create a category with no tax-line mapping.
create table pick_list_options (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  list_name text not null,
  value text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (account_id, list_name, value)
);

create index pick_list_options_account_list_idx on pick_list_options (account_id, list_name);

alter table pick_list_options enable row level security;

create policy "members can manage their pick list options"
  on pick_list_options for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- documents.category was a fixed check constraint against 7 named values.
-- Replace it with the generic pick list — valid values are now dynamic
-- per account, enforced at the application layer (against active
-- pick_list_options rows) instead of a database check constraint.
alter table documents drop constraint documents_category_check;

-- tasks.task_type did not exist before this migration. Added as a plain
-- nullable column with zero seeded pick-list options — per CLAUDE.md's
-- data-integrity rule, no default task types are invented here; the
-- account owner adds their own via Manage Options.
alter table tasks add column task_type text;

-- Seed document_type with the exact 7 category strings the app has
-- already shipped and enforced since the Documents Architecture
-- migration (20260910200000) — carrying forward an existing, already-
-- established taxonomy is not the same as guessing a new one. Generic
-- over whatever accounts exist today (not hardcoded to ZMR), so this
-- also does the right thing — nothing — for an account with none yet.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'document_type', c.value
from accounts a
cross join (
  values ('Leases'), ('Insurance'), ('Tax Documents'), ('Receipts'), ('Mortgage Documents'), ('Photos'), ('Other')
) as c(value)
on conflict (account_id, list_name, value) do nothing;

-- subcategory, payment_method, and task_type start with zero seeded
-- options: subcategory and payment_method were always free text with no
-- established option set to carry forward (seeding either would be
-- guessing), and task_type is brand new. The account owner populates all
-- three via Manage Options.
