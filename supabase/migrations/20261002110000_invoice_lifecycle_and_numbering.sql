-- T4 Stage 1 — Rent & Payments Assistant: invoice lifecycle, itemized lines,
-- entity-specific numbering, event history and preserved PDFs (RP5 slice).
--
-- Extends the EXISTING Rent ops `invoices` table — Rent ops, the assistant's
-- Workload and Approvals all read these same rows (no agent ledger, no copies).
-- Payments stay Rent ops `payments`; no Financials rows are created here.
--
-- Rules enforced in the database (so manual and assistant paths are equal):
--   * Invoices change only through the functions below (direct writes are
--     refused), so approval, numbering and issued-document protection can't
--     be bypassed.
--   * Every edit requires the version the editor read; a stale edit is
--     refused (detects edits made while the assistant or another tab works).
--   * Any change to recipient, visible content (amount, lines, due date,
--     issuer, visible note) clears an approval; only the internal note is
--     exempt.
--   * Numbers are assigned only by issue_invoice: per issuing entity and
--     document type, six digits minimum ({CODE}-INV-000001), continuous, no
--     reset, the sequence row locked for the allocation, plus a unique index.
--     Cancelled/superseded numbers are never reused.
--   * Issued invoices are never edited; a revision is a new row ({number}-R2)
--     and the original is kept (superseded) with its PDF.
--
-- Legacy rows: existing invoices were live manual invoices; they become
-- state 'issued' with no number (never renumbered retroactively).
-- Error codes ZM310–ZM339.

-- ---------------------------------------------------------------- columns
alter table invoices
  add column lease_id uuid references leases(id) on delete restrict,
  add column billing_entity_id uuid references llcs(id) on delete restrict,
  add column state text,
  add column number text,
  add column revision integer not null default 1 check (revision >= 1),
  add column revision_of uuid references invoices(id) on delete restrict,
  add column version integer not null default 1,
  add column material_version integer not null default 1,
  add column approved_material_version integer,
  add column approved_by uuid references auth.users(id),
  add column approved_at timestamptz,
  add column issued_by uuid references auth.users(id),
  add column issued_at timestamptz,
  add column cancelled_by uuid references auth.users(id),
  add column cancelled_at timestamptz,
  add column cancel_reason text,
  -- Display name of the billed people (also written to legacy billed_to).
  add column recipient_name text,
  -- Billed people as printed: [{tenant_id, name, email, phone}], taken from
  -- their tenant profiles when drafted; refreshed only by an explicit action.
  add column recipients jsonb not null default '[]',
  add column visible_note text,
  add column internal_note text,
  -- Everything the approved document would print (issuer, branding, payment
  -- instructions, recipients, rental, lines, dates, note). Issue refuses if
  -- the current print content differs from this — approval covers the exact
  -- printed document.
  add column approved_snapshot jsonb,
  -- The approved snapshot, frozen at issue: later settings changes never
  -- alter an issued invoice.
  add column issued_snapshot jsonb,
  add column created_via text not null default 'owner' check (created_via in ('owner', 'assistant')),
  add column agent_run_id uuid,
  add column updated_at timestamptz not null default now();

update invoices set state = 'issued' where state is null;

alter table invoices
  alter column state set not null,
  alter column state set default 'draft',
  add constraint invoices_state_check
    check (state in ('draft', 'approved', 'issued', 'superseded', 'cancelled', 'rejected')),
  -- New-flow invoices (tied to a tenancy) always carry a number once issued.
  add constraint invoices_issued_numbered
    check (lease_id is null or state in ('draft', 'approved', 'rejected') or number is not null);

create unique index invoices_number_unique on invoices (account_id, billing_entity_id, number) where number is not null;
-- RP1: one charge per tenancy and period by default (revisions excluded).
create unique index invoices_one_per_tenancy_period on invoices (lease_id, period_start)
  where lease_id is not null and revision_of is null and state not in ('rejected', 'cancelled');
create index invoices_lease_idx on invoices (lease_id);

-- ---------------------------------------------------------------- lines
create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  line_kind text not null check (line_kind in ('rent', 'prorated_rent', 'charge', 'credit')),
  description text not null check (length(trim(description)) > 0),
  amount numeric(10, 2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint invoice_lines_sign check ((line_kind = 'credit' and amount < 0) or (line_kind <> 'credit' and amount >= 0))
);
create index invoice_lines_invoice_idx on invoice_lines (invoice_id);

-- ---------------------------------------------------------------- events
create table invoice_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  event text not null check (event in ('created', 'edited', 'approval_cleared', 'approved', 'rejected', 'issued', 'revised', 'superseded', 'cancelled', 'pdf_attached')),
  actor uuid default auth.uid(),
  at timestamptz not null default now(),
  version integer,
  detail jsonb
);
create index invoice_events_invoice_idx on invoice_events (invoice_id, at);

-- ---------------------------------------------------------------- sequences
create table document_sequences (
  account_id uuid not null references accounts(id) on delete cascade,
  entity_id uuid not null references llcs(id) on delete restrict,
  doc_type text not null check (doc_type in ('invoice', 'receipt')),
  next_value bigint not null default 1 check (next_value >= 1),
  -- Set by the first issuance; after that the start can never be changed.
  first_issued_at timestamptz,
  primary key (entity_id, doc_type)
);

-- ---------------------------------------------------------------- PDFs
alter table documents add column invoice_id uuid references invoices(id) on delete restrict;
create unique index documents_invoice_pdf_unique on documents (invoice_id) where invoice_id is not null;

-- ---------------------------------------------------------------- RLS
alter table invoice_lines enable row level security;
alter table invoice_events enable row level security;
alter table document_sequences enable row level security;
create policy "members can read and write their invoice lines" on invoice_lines for all
  using (is_account_member(account_id)) with check (is_account_member(account_id));
create policy "members can read and write their invoice events" on invoice_events for all
  using (is_account_member(account_id)) with check (is_account_member(account_id));
create policy "members can read and write their document sequences" on document_sequences for all
  using (is_account_member(account_id)) with check (is_account_member(account_id));

-- ---------------------------------------------------------------- guards
create or replace function invoice_op_active() returns boolean language sql stable as $$
  select coalesce(current_setting('app.invoice_op', true), '') = 'on'
$$;

-- Owner-only invoicing (owner-approved September 30, 2026). Every invoice
-- action calls this first, before any other check, so a non-owner always
-- gets the same clear refusal. is_account_owner() reads the existing
-- account_members.role (defined in 20261001190000). Server-side
-- maintenance roles are outside dashboard access control, as with RLS.
-- Table triggers in 20261002160000 back this up for direct writes.
create or replace function invoice_require_owner(p_account_id uuid) returns void
language plpgsql stable set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not is_account_owner(p_account_id) then
    raise exception 'Only the portfolio owner can change invoicing in this release'
      using errcode = 'ZM370',
            hint = 'Your access to this portfolio doesn''t include invoicing changes. Ask the owner to make this change.';
  end if;
end $$;

create or replace function invoices_guard() returns trigger language plpgsql set search_path = public as $$
declare
  frozen text[] := array['state', 'version', 'updated_at', 'cancelled_at', 'cancelled_by', 'cancel_reason'];
begin
  if tg_op = 'DELETE' then
    if old.number is not null then
      raise exception 'Numbered invoices are never deleted; cancel instead' using errcode = 'ZM310';
    end if;
    return old;
  end if;
  if not invoice_op_active() then
    -- Also what an out-of-date dashboard tab sees if it tries the old direct
    -- "Create invoice" insert: a clear instruction, nothing saved.
    raise exception 'Invoices are now created and changed through the review-and-issue flow. Reload the dashboard to continue — nothing was saved.'
      using errcode = 'ZM311';
  end if;
  if tg_op = 'UPDATE' and old.state in ('issued', 'superseded', 'cancelled', 'rejected') then
    if (to_jsonb(new) - frozen) <> (to_jsonb(old) - frozen)
       or not (new.state = old.state or (old.state = 'issued' and new.state in ('superseded', 'cancelled'))) then
      raise exception 'An issued or closed invoice is never edited; create a revision instead' using errcode = 'ZM312';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;

create trigger invoices_guard before insert or update or delete on invoices
  for each row execute function invoices_guard();

create or replace function invoice_children_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if not invoice_op_active() then
    raise exception 'Invoice lines, events and number sequences change only through the invoice actions' using errcode = 'ZM313';
  end if;
  return coalesce(new, old);
end $$;

create trigger invoice_lines_guard before insert or update or delete on invoice_lines
  for each row execute function invoice_children_guard();
create trigger invoice_events_guard before insert or update or delete on invoice_events
  for each row execute function invoice_children_guard();
create trigger document_sequences_guard before insert or update or delete on document_sequences
  for each row execute function invoice_children_guard();

-- Issued PDFs are preserved: attach once to an issued/closed invoice, then
-- never changed or removed.
create or replace function documents_invoice_pdf_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.invoice_id is not null then
    raise exception 'An issued invoice PDF is preserved and cannot be changed or removed' using errcode = 'ZM314';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.invoice_id is not null then
    if not invoice_op_active() then
      raise exception 'Invoice PDFs are attached only through attach_invoice_pdf' using errcode = 'ZM315';
    end if;
    if not exists (select 1 from invoices where id = new.invoice_id and account_id = new.account_id
                   and state in ('issued', 'superseded', 'cancelled') and number is not null) then
      raise exception 'A PDF can only be attached to an issued, numbered invoice in the same account' using errcode = 'ZM315';
    end if;
  end if;
  return coalesce(new, old);
end $$;

create trigger documents_invoice_pdf_guard before insert or update or delete on documents
  for each row execute function documents_invoice_pdf_guard();

-- Rent ops payments may only be recorded against issued invoices (never a
-- draft). Payments themselves are unchanged otherwise.
create or replace function payments_invoice_state_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from invoices where id = new.invoice_id and state = 'issued') then
    raise exception 'Payments can only be recorded against an issued invoice' using errcode = 'ZM316';
  end if;
  return new;
end $$;

create trigger payments_invoice_state_guard before insert or update of invoice_id on payments
  for each row execute function payments_invoice_state_guard();

-- ---------------------------------------------------------------- helpers
create or replace function format_document_number(p_code text, p_doc_type text, p_seq bigint)
returns text language sql immutable as $$
  select p_code || '-' || case p_doc_type when 'invoice' then 'INV' else 'RCT' end || '-'
         || lpad(p_seq::text, greatest(6, length(p_seq::text)), '0')
$$;

create or replace function invoice_log(p_inv invoices, p_event text, p_detail jsonb default null)
returns void language sql set search_path = public as $$
  insert into invoice_events (account_id, invoice_id, event, version, detail)
  values (p_inv.account_id, p_inv.id, p_event, p_inv.version, p_detail)
$$;

-- Every reason a tenancy can't be drafted for a month. Codes the dashboard
-- maps to a message and a link to the field's home.
create or replace function get_invoice_draft_blockers(p_lease_id uuid, p_period_start date)
returns text[] language plpgsql stable set search_path = public as $$
declare
  l leases; t lease_billing_terms; p properties;
  v_period_end date := (p_period_start + interval '1 month' - interval '1 day')::date;
  v_from date; v_to date;
  b text[] := '{}';
begin
  if p_period_start <> date_trunc('month', p_period_start)::date then
    raise exception 'The billing period must start on the first of a month' using errcode = 'ZM317';
  end if;
  select * into l from leases where id = p_lease_id;
  if not found then return array['lease_not_found']; end if;
  select * into t from lease_billing_terms where lease_id = l.id;
  select * into p from properties where id = l.property_id;
  if l.rent_amount is null then b := array_append(b, 'lease_rent'); end if;
  if t.lease_id is null or t.due_day is null then b := array_append(b, 'due_day'); end if;
  if p.billing_entity_id is null then b := array_append(b, 'billing_entity'); end if;
  if not exists (select 1 from lease_tenants where lease_id = l.id and is_billing_recipient) then
    b := array_append(b, 'billing_recipient');
  end if;
  v_from := coalesce(t.effective_from, l.start_date);
  v_to := coalesce(t.effective_to, l.end_date);
  if l.archived or v_from > v_period_end or (v_to is not null and v_to < p_period_start) then
    b := array_append(b, 'not_active_in_period');
  elsif (v_from > p_period_start or (v_to is not null and v_to < v_period_end)) and coalesce(t.prorate_rule, 'none') = 'manual' then
    b := array_append(b, 'prorate_manual');
  end if;
  if exists (select 1 from invoices where lease_id = l.id and period_start = p_period_start
             and revision_of is null and state not in ('rejected', 'cancelled')) then
    b := array_append(b, 'already_invoiced');
  end if;
  return b;
end $$;
