-- Quick Capture redesign (roadmap 1.5-1.11).
--
-- 1.6: a 4th entry type, 'mileage' — replacing the previously-separate
-- mileage_log table/form entirely (that mechanism duplicated the same
-- "miles driven for a property" information Quick Capture now owns,
-- which the new Single Source of Truth rule in CLAUDE.md exists to
-- prevent). mileage_log itself is left in place, empty and unused,
-- rather than dropped — dropping a table is a destructive step CLAUDE.md
-- reserves for an explicit, separate approval.
alter table capture_log drop constraint capture_log_entry_type_check;
alter table capture_log add constraint capture_log_entry_type_check
  check (entry_type in ('receipt', 'visit', 'communication', 'mileage'));

alter table capture_log add column miles_driven numeric(8, 1);

-- 1.9 — void/delete for a staged (not-yet-reconciled) entry, same
-- voided/voided_at pattern used everywhere else in this schema
-- (mortgage_details, mortgage_payments, financial_transactions, ...).
alter table capture_log add column voided boolean not null default false;
alter table capture_log add column voided_at timestamptz;

-- 1.11 — the manual "mark complete" override. Computed completeness
-- (has the type-relevant fields filled in) lives in application code
-- (captureCalculations.ts), not the database; this column only records
-- the explicit override that forces Complete regardless of that
-- computation.
alter table capture_log add column manually_completed boolean not null default false;

-- 1.8 — up to 25 attachments per entry, replacing the single
-- attachment_path/attachment_type columns (both tables are empty in
-- production right now, confirmed live before writing this migration,
-- so there's no existing single-attachment data to carry forward).
alter table capture_log drop column attachment_path;
alter table capture_log drop column attachment_type;

create table capture_attachments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  capture_log_id uuid not null references capture_log(id) on delete cascade,
  storage_path text not null,
  attachment_type text not null check (attachment_type in ('photo', 'pdf')),
  created_at timestamptz not null default now()
);

create index capture_attachments_capture_log_id_idx on capture_attachments (capture_log_id);

alter table capture_attachments enable row level security;

create policy "members can manage their capture attachments"
  on capture_attachments for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
