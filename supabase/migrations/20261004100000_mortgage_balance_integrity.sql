-- Mortgage balance integrity (T1; owner-approved 2026-10-01: "Yes, build the mortgage integrity fix with those choices").
-- Contract v2 (bed4174) + owner choices + T3 M1–M10 and F1–F4/B1–B4 corrections
-- (record: docs/planning/mortgage/ZMR-mortgage-integrity-implementation.md):
--   * owner 1: inactive/replaced loans keep frozen balances; no review solely for being inactive;
--   * owner 2: an older page can't change a balance (reload required). The loan guard runs with the CALLER's rights and
--     refuses any balance or counter change made by an ordinary client role (authenticated/anon); only the server-side
--     writers below (which run as their owner and check membership) can change them;
--   * owner 3: reversals above the original loan amount are refused with a review cause;
--   * historical entries (B4): every entry is applied as today. If it is dated on/before the balance's latest statement
--     date (or, when none was given, the date the figure was last entered), it ALSO raises a review cause — flagged for a
--     person, never skipped or guessed. Statement dates are stored only when given; unknown stays unknown.
--
-- Data impact: no existing activity row, balance or loan value changes. Existing entries stay mortgage_id NULL
-- (unlinked legacy property activity); no backfill, no guessed links, no historical correction. Existing loans get
-- counters 0, statement dates NULL (unknown), and figure-entered timestamps = the row's own last-write time.
-- Permissions are unchanged: any workspace member, exactly as the mortgage tables already allow.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------------------------------------------
alter table mortgage_details
  add column principal_version bigint not null default 0,     -- M7: one version counter per balance
  add column escrow_version bigint not null default 0,
  add column principal_epoch integer not null default 0,      -- reset counters (a reset since an entry stops its reversal)
  add column escrow_epoch integer not null default 0,
  add column principal_as_of date,                            -- statement dates; NULL = unknown (never defaulted)
  add column escrow_as_of date,
  add column principal_figure_at timestamptz,                 -- when a person last entered/updated the figure
  add column escrow_figure_at timestamptz;
-- Backfill metadata only; the audit trigger is paused for this one statement so existing history gains no rows.
alter table mortgage_details disable trigger mortgage_details_audit_log;
update mortgage_details set principal_figure_at = updated_at, escrow_figure_at = updated_at;
alter table mortgage_details enable trigger mortgage_details_audit_log;
alter table mortgage_details
  alter column principal_figure_at set not null, alter column principal_figure_at set default now(),
  alter column escrow_figure_at set not null, alter column escrow_figure_at set default now();

alter table mortgage_payments
  add column mortgage_id uuid references mortgage_details(id),
  add column void_reason text,
  add column void_outcome text check (void_outcome in
    ('reversed', 'skipped_reset_after_entry', 'skipped_loan_inactive', 'skipped_unlinked_legacy'));
alter table mortgage_escrow_transactions
  add column mortgage_id uuid references mortgage_details(id),
  add column void_reason text,
  add column void_outcome text check (void_outcome in
    ('reversed', 'skipped_reset_after_entry', 'skipped_loan_inactive', 'skipped_unlinked_legacy'));
create index mortgage_payments_mortgage_idx on mortgage_payments (mortgage_id);
create index mortgage_escrow_transactions_mortgage_idx on mortgage_escrow_transactions (mortgage_id);

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Append-only balance-effects ledger (authoritative record of balance decisions + exactly-once keys).
-- ---------------------------------------------------------------------------------------------------------------
create table mortgage_balance_effects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  mortgage_id uuid references mortgage_details(id),
  source_kind text not null check (source_kind in ('payment', 'escrow', 'reset')),
  source_id uuid not null,
  effect text not null check (effect in ('applied', 'reversed', 'reversal_skipped', 'reset', 'void_refused')),
  principal_delta numeric(12, 2) not null default 0,
  escrow_delta numeric(12, 2) not null default 0,
  principal_epoch integer,
  escrow_epoch integer,
  reason text,
  statement_date date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index mortgage_balance_effects_once_idx
  on mortgage_balance_effects (source_kind, source_id, effect)
  where effect in ('applied', 'reversed', 'reversal_skipped');
create index mortgage_balance_effects_mortgage_idx on mortgage_balance_effects (mortgage_id, created_at);
alter table mortgage_balance_effects enable row level security;
create policy "members can view their mortgage balance effects"
  on mortgage_balance_effects for select using (is_account_member(account_id));
revoke all on mortgage_balance_effects from anon;
revoke insert, update, delete, truncate on mortgage_balance_effects from authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 3. Review causes. The Action Queue "Mortgage balance review" is DERIVED from unresolved causes (no action_items row,
--    so generic task completion can't dismiss it). One open cause per (entry, cause). Each cause stores the context a
--    person needs to decide it safely (B3): the entry's date/type/amount and the balance's latest update.
-- ---------------------------------------------------------------------------------------------------------------
create table mortgage_balance_review_causes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  -- the loan whose balance should be checked (for unlinked legacy entries: the property's active loan at void time —
  -- a review target, not a claim that the entry belonged to it)
  review_mortgage_id uuid not null references mortgage_details(id),
  balance_kind text not null check (balance_kind in ('principal', 'escrow')),
  cause text not null check (cause in ('skipped_reset_after_entry', 'skipped_unlinked_legacy', 'refused_negative_escrow',
                                       'refused_over_original', 'possibly_covered_by_statement')),
  source_kind text not null check (source_kind in ('payment', 'escrow')),
  source_id uuid not null,
  context jsonb not null default '{}',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution text check (resolution in ('reset', 'confirmed', 'voided', 'acknowledged')),
  resolved_by_effect uuid references mortgage_balance_effects(id)
);
create unique index mortgage_balance_review_causes_open_idx
  on mortgage_balance_review_causes (source_kind, source_id, cause) where resolved_at is null;
create index mortgage_balance_review_causes_loan_idx
  on mortgage_balance_review_causes (review_mortgage_id) where resolved_at is null;
alter table mortgage_balance_review_causes enable row level security;
create policy "members can view their mortgage balance review causes"
  on mortgage_balance_review_causes for select using (is_account_member(account_id));
revoke all on mortgage_balance_review_causes from anon;
revoke insert, update, delete, truncate on mortgage_balance_review_causes from authenticated;

-- Context recorded on a cause: the entry, and the balance's latest update (time entered; statement date if given).
create or replace function mortgage_cause_context(p_kind text, r jsonb, l public.mortgage_details)
returns jsonb
language sql
stable
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'entry_date', coalesce(r->>'payment_date', r->>'transaction_date'),
    'entry_type', case when p_kind = 'payment' then 'payment' else r->>'transaction_type' end,
    'amount', r->>'amount',
    'principal', r->>'principal_amount',
    'entry_recorded_at', r->>'created_at',
    'balance_updated_at', case when p_kind = 'payment' then l.principal_figure_at else l.escrow_figure_at end,
    'statement_date', case when p_kind = 'payment' then l.principal_as_of else l.escrow_as_of end))
$$;
revoke all on function mortgage_cause_context(text, jsonb, public.mortgage_details) from public, anon, authenticated;

-- True for an ordinary signed-in client statement (PostgREST role); false inside the SECURITY DEFINER writers below
-- (they run as their owner) and in admin/migration sessions.
create or replace function mortgage_is_client_write()
returns boolean
language sql
stable
set search_path = pg_catalog, public, pg_temp
as $$ select current_user in ('authenticated', 'anon') $$;
revoke all on function mortgage_is_client_write() from public, anon;
grant execute on function mortgage_is_client_write() to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 4. Loan row guard — SECURITY INVOKER on purpose: current_user tells a client statement from a server-side writer.
-- ---------------------------------------------------------------------------------------------------------------
create or replace function mortgage_details_balance_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.principal_version := 0;
    new.escrow_version := 0;
    new.principal_epoch := 0;
    new.escrow_epoch := 0;
    new.principal_figure_at := now();
    new.escrow_figure_at := now();
    if new.principal_as_of > current_date or new.escrow_as_of > current_date then
      raise exception 'A statement date can''t be in the future.' using errcode = '22023';
    end if;
    return new;
  end if;

  if not public.mortgage_is_client_write() then
    return new;
  end if;
  -- compared with the row Postgres has just locked (re-checked against the newest version if another write landed
  -- first), so a stale form's balance always differs and is refused; an identical value can't overwrite anything.
  if new.current_balance is distinct from old.current_balance
     or new.escrow_balance is distinct from old.escrow_balance then
    raise exception 'This page is out of date and can''t change the mortgage balance. Copy any unsaved changes, reload the page, then try again. Nothing was saved.'
      using errcode = 'ZM5M6';
  end if;
  if (new.principal_version, new.escrow_version, new.principal_epoch, new.escrow_epoch, new.principal_as_of,
      new.escrow_as_of, new.principal_figure_at, new.escrow_figure_at)
     is distinct from
     (old.principal_version, old.escrow_version, old.principal_epoch, old.escrow_epoch, old.principal_as_of,
      old.escrow_as_of, old.principal_figure_at, old.escrow_figure_at) then
    raise exception 'Mortgage balance details can only be changed through a balance update.' using errcode = 'ZM5M6';
  end if;
  return new;
end;
$$;
create trigger mortgage_details_balance_guard
  before insert or update on mortgage_details
  for each row execute function mortgage_details_balance_guard();

-- M1: a new loan's opening balances are recorded as an initial reset effect (statement date when given).
create or replace function mortgage_record_opening()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  insert into public.mortgage_balance_effects
    (account_id, property_id, mortgage_id, source_kind, source_id, effect, principal_delta, escrow_delta,
     principal_epoch, escrow_epoch, reason, statement_date)
  values (new.account_id, new.property_id, new.id, 'reset', new.id, 'reset', new.current_balance,
          coalesce(new.escrow_balance, 0), 0, 0, 'opening', new.principal_as_of);
  return new;
end;
$$;
revoke all on function mortgage_record_opening() from public, anon, authenticated;
create trigger mortgage_details_record_opening
  after insert on mortgage_details
  for each row execute function mortgage_record_opening();

-- ---------------------------------------------------------------------------------------------------------------
-- 5. New entries: check membership, lock the active loan, validate against the locked values, link, apply. An entry
--    dated on/before the balance's latest statement date (or, if none given, the date the figure was entered) also
--    raises a "possibly covered by statement" review cause (B4) — it is still applied; nothing is guessed.
-- ---------------------------------------------------------------------------------------------------------------
drop trigger if exists mortgage_payments_apply_to_balance on mortgage_payments;
drop trigger if exists mortgage_escrow_transactions_apply_to_balance on mortgage_escrow_transactions;

create or replace function mortgage_entry_may_be_covered(p_effective date, p_as_of date, p_figure_at timestamptz)
returns boolean
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$ select p_effective <= coalesce(p_as_of, (p_figure_at at time zone 'UTC')::date) $$;
revoke all on function mortgage_entry_may_be_covered(date, date, timestamptz) from public, anon, authenticated;

create or replace function mortgage_payment_apply_locked()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  l public.mortgage_details%rowtype;
begin
  if auth.uid() is not null and not public.is_account_member(new.account_id) then
    raise exception 'Not a member of this workspace.' using errcode = '42501';
  end if;
  select * into l from public.mortgage_details where property_id = new.property_id and not voided for update;
  if not found then
    raise exception 'No active mortgage_details found for property %; enter loan terms before logging payments.', new.property_id;
  end if;
  if l.account_id <> new.account_id then
    raise exception 'This mortgage belongs to a different workspace.' using errcode = '42501';
  end if;
  if new.mortgage_id is not null and new.mortgage_id <> l.id then
    raise exception 'A new payment can only be recorded against the property''s active mortgage.' using errcode = 'ZM5M1';
  end if;
  if new.principal_amount > l.current_balance then
    raise exception 'Principal amount (%) exceeds the current mortgage balance (%).', new.principal_amount, l.current_balance;
  end if;

  new.mortgage_id := l.id;
  new.voided := false;
  new.voided_at := null;
  new.void_reason := null;
  new.void_outcome := null;

  update public.mortgage_details
     set current_balance = l.current_balance - new.principal_amount,
         principal_version = l.principal_version + 1,
         updated_at = now()
   where id = l.id;
  insert into public.mortgage_balance_effects
    (account_id, property_id, mortgage_id, source_kind, source_id, effect, principal_delta, principal_epoch, escrow_epoch)
  values (new.account_id, new.property_id, l.id, 'payment', new.id, 'applied', -new.principal_amount, l.principal_epoch, l.escrow_epoch);

  if public.mortgage_entry_may_be_covered(new.payment_date, l.principal_as_of, l.principal_figure_at) then
    insert into public.mortgage_balance_review_causes
      (account_id, property_id, review_mortgage_id, balance_kind, cause, source_kind, source_id, context)
    values (new.account_id, new.property_id, l.id, 'principal', 'possibly_covered_by_statement', 'payment', new.id,
            public.mortgage_cause_context('payment', to_jsonb(new), l));
  end if;
  return new;
end;
$$;

create or replace function mortgage_escrow_apply_locked()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  l public.mortgage_details%rowtype;
  before_escrow numeric(12, 2);
  delta numeric(12, 2);
begin
  if auth.uid() is not null and not public.is_account_member(new.account_id) then
    raise exception 'Not a member of this workspace.' using errcode = '42501';
  end if;
  select * into l from public.mortgage_details where property_id = new.property_id and not voided for update;
  if not found then
    raise exception 'No active mortgage_details found for property %; enter loan terms before logging escrow transactions.', new.property_id;
  end if;
  if l.account_id <> new.account_id then
    raise exception 'This mortgage belongs to a different workspace.' using errcode = '42501';
  end if;
  if new.mortgage_id is not null and new.mortgage_id <> l.id then
    raise exception 'A new escrow entry can only be recorded against the property''s active mortgage.' using errcode = 'ZM5M1';
  end if;
  before_escrow := coalesce(l.escrow_balance, 0);
  if new.transaction_type = 'disbursement' and new.amount > before_escrow then
    raise exception 'Disbursement amount (%) exceeds the current escrow balance (%).', new.amount, before_escrow;
  end if;
  delta := case when new.transaction_type = 'deposit' then new.amount else -new.amount end;

  new.mortgage_id := l.id;
  new.voided := false;
  new.voided_at := null;
  new.void_reason := null;
  new.void_outcome := null;

  update public.mortgage_details
     set escrow_balance = before_escrow + delta,
         escrow_version = l.escrow_version + 1,
         updated_at = now()
   where id = l.id;
  insert into public.mortgage_balance_effects
    (account_id, property_id, mortgage_id, source_kind, source_id, effect, escrow_delta, principal_epoch, escrow_epoch)
  values (new.account_id, new.property_id, l.id, 'escrow', new.id, 'applied', delta, l.principal_epoch, l.escrow_epoch);

  if public.mortgage_entry_may_be_covered(new.transaction_date, l.escrow_as_of, l.escrow_figure_at) then
    insert into public.mortgage_balance_review_causes
      (account_id, property_id, review_mortgage_id, balance_kind, cause, source_kind, source_id, context)
    values (new.account_id, new.property_id, l.id, 'escrow', 'possibly_covered_by_statement', 'escrow', new.id,
            public.mortgage_cause_context('escrow', to_jsonb(new), l));
  end if;
  return new;
end;
$$;
revoke all on function mortgage_payment_apply_locked() from public, anon, authenticated;
revoke all on function mortgage_escrow_apply_locked() from public, anon, authenticated;
create trigger mortgage_payments_apply_locked
  before insert on mortgage_payments
  for each row execute function mortgage_payment_apply_locked();
create trigger mortgage_escrow_transactions_apply_locked
  before insert on mortgage_escrow_transactions
  for each row execute function mortgage_escrow_apply_locked();

-- ---------------------------------------------------------------------------------------------------------------
-- 6. Conditional, exactly-once void core (internal). Takes the loan lock itself (already held in the void function's
--    path; in an older page's UPDATE path the entry row is locked first — the one documented cycle, which Postgres
--    breaks cleanly with 40P01). A refusal either raises (older page: nothing kept) or records ONE refusal per open
--    cause (current app: the refusal and its cause commit together; the entry stays active).
-- ---------------------------------------------------------------------------------------------------------------
create or replace function mortgage_void_core(p_kind text, r jsonb, p_raise boolean)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  l public.mortgage_details%rowtype;
  a public.mortgage_balance_effects%rowtype;
  p_id uuid := (r->>'id')::uuid;
  p_account uuid := (r->>'account_id')::uuid;
  p_property uuid := (r->>'property_id')::uuid;
  p_mortgage uuid := (r->>'mortgage_id')::uuid;
  kind text := case when p_kind = 'payment' then 'principal' else 'escrow' end;
  delta numeric(12, 2);
  new_value numeric(12, 2);
  cause_id uuid;
begin
  if p_mortgage is null then
    -- unlinked legacy entry: lock the property's active loan (if any), record the skip, raise a review on that loan
    select * into l from public.mortgage_details where property_id = p_property and not voided for update;
    insert into public.mortgage_balance_effects (account_id, property_id, source_kind, source_id, effect, reason)
    values (p_account, p_property, p_kind, p_id, 'reversal_skipped', 'unlinked_legacy')
    on conflict do nothing;
    if l.id is not null then
      insert into public.mortgage_balance_review_causes
        (account_id, property_id, review_mortgage_id, balance_kind, cause, source_kind, source_id, context)
      values (p_account, p_property, l.id, kind, 'skipped_unlinked_legacy', p_kind, p_id, public.mortgage_cause_context(p_kind, r, l))
      on conflict do nothing;
    end if;
    return 'skipped_unlinked_legacy';
  end if;

  select * into l from public.mortgage_details where id = p_mortgage for update;

  if l.voided then
    insert into public.mortgage_balance_effects (account_id, property_id, mortgage_id, source_kind, source_id, effect, reason)
    values (p_account, p_property, l.id, p_kind, p_id, 'reversal_skipped', 'loan_inactive')
    on conflict do nothing;
    return 'skipped_loan_inactive';
  end if;

  select * into a from public.mortgage_balance_effects
   where source_kind = p_kind and source_id = p_id and effect = 'applied';
  if not found then
    raise exception 'No recorded balance effect for this entry.' using errcode = 'ZM5M8';
  end if;

  if (kind = 'principal' and l.principal_epoch <> a.principal_epoch)
     or (kind = 'escrow' and l.escrow_epoch <> a.escrow_epoch) then
    insert into public.mortgage_balance_effects
      (account_id, property_id, mortgage_id, source_kind, source_id, effect, reason, principal_epoch, escrow_epoch)
    values (p_account, p_property, l.id, p_kind, p_id, 'reversal_skipped', 'reset_after_entry', l.principal_epoch, l.escrow_epoch)
    on conflict do nothing;
    insert into public.mortgage_balance_review_causes
      (account_id, property_id, review_mortgage_id, balance_kind, cause, source_kind, source_id, context)
    values (p_account, p_property, l.id, kind, 'skipped_reset_after_entry', p_kind, p_id, public.mortgage_cause_context(p_kind, r, l))
    on conflict do nothing;
    return 'skipped_reset_after_entry';
  end if;

  if kind = 'principal' then
    delta := -a.principal_delta;
    new_value := l.current_balance + delta;
    if new_value > l.original_loan_amount then
      if p_raise then
        raise exception 'Not voided: this would raise the balance above the original loan amount (%). Check the balance against your statement.', l.original_loan_amount
          using errcode = 'ZM5M4';
      end if;
      insert into public.mortgage_balance_review_causes
        (account_id, property_id, review_mortgage_id, balance_kind, cause, source_kind, source_id, context)
      values (p_account, p_property, l.id, kind, 'refused_over_original', p_kind, p_id, public.mortgage_cause_context(p_kind, r, l))
      on conflict do nothing
      returning id into cause_id;
      if cause_id is not null then
        insert into public.mortgage_balance_effects (account_id, property_id, mortgage_id, source_kind, source_id, effect, principal_delta, reason)
        values (p_account, p_property, l.id, p_kind, p_id, 'void_refused', delta, 'over_original');
      end if;
      return 'refused_over_original';
    end if;
    update public.mortgage_details set current_balance = new_value, principal_version = l.principal_version + 1, updated_at = now() where id = l.id;
  else
    delta := -a.escrow_delta;
    new_value := coalesce(l.escrow_balance, 0) + delta;
    if new_value < 0 then
      if p_raise then
        raise exception 'Not voided: a later disbursement used this deposit, so voiding it would make escrow negative. Void that disbursement first, or update escrow from a statement.'
          using errcode = 'ZM5M3';
      end if;
      insert into public.mortgage_balance_review_causes
        (account_id, property_id, review_mortgage_id, balance_kind, cause, source_kind, source_id, context)
      values (p_account, p_property, l.id, kind, 'refused_negative_escrow', p_kind, p_id, public.mortgage_cause_context(p_kind, r, l))
      on conflict do nothing
      returning id into cause_id;
      if cause_id is not null then
        insert into public.mortgage_balance_effects (account_id, property_id, mortgage_id, source_kind, source_id, effect, escrow_delta, reason)
        values (p_account, p_property, l.id, p_kind, p_id, 'void_refused', delta, 'negative_escrow');
      end if;
      return 'refused_negative_escrow';
    end if;
    update public.mortgage_details set escrow_balance = new_value, escrow_version = l.escrow_version + 1, updated_at = now() where id = l.id;
  end if;

  insert into public.mortgage_balance_effects
    (account_id, property_id, mortgage_id, source_kind, source_id, effect, principal_delta, escrow_delta, principal_epoch, escrow_epoch)
  values (p_account, p_property, l.id, p_kind, p_id, 'reversed',
          case when kind = 'principal' then delta else 0 end, case when kind = 'escrow' then delta else 0 end,
          l.principal_epoch, l.escrow_epoch);
  -- the void that finally succeeds closes earlier refusal causes and any "possibly covered" flag for this entry
  update public.mortgage_balance_review_causes
     set resolved_at = now(), resolved_by = auth.uid(), resolution = 'voided'
   where source_kind = p_kind and source_id = p_id
     and cause in ('refused_over_original', 'refused_negative_escrow', 'possibly_covered_by_statement')
     and resolved_at is null;
  return 'reversed';
end;
$$;
revoke all on function mortgage_void_core(text, jsonb, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 7. Activity guard (SECURITY DEFINER so an older page's plain void can run the conditional core). Facts are immutable;
--    un-void and deletes are refused; void details can only be set by voiding. The void function marks its own update
--    with a transaction-local setting (not settable through PostgREST — verified by T3) so the core runs once.
-- ---------------------------------------------------------------------------------------------------------------
create or replace function mortgage_activity_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  facts_changed boolean;
  outcome text;
begin
  if tg_table_name = 'mortgage_payments' then
    facts_changed := (new.payment_date, new.amount, new.principal_amount, new.interest_amount)
                     is distinct from (old.payment_date, old.amount, old.principal_amount, old.interest_amount);
  else
    facts_changed := (new.transaction_date, new.transaction_type, new.amount)
                     is distinct from (old.transaction_date, old.transaction_type, old.amount);
  end if;
  if facts_changed
     or (new.id, new.account_id, new.property_id, new.mortgage_id, new.created_at)
        is distinct from (old.id, old.account_id, old.property_id, old.mortgage_id, old.created_at) then
    raise exception 'A recorded mortgage entry can''t be changed. Void it and record a new entry instead.' using errcode = 'ZM5M2';
  end if;
  if old.voided then
    if not new.voided then
      raise exception 'A voided mortgage entry can''t be restored. Record a new entry instead.' using errcode = 'ZM5M2';
    end if;
    new.voided_at := old.voided_at;
    new.void_reason := old.void_reason;
    new.void_outcome := old.void_outcome;
    return new;
  end if;
  if not new.voided then
    if (new.voided_at, new.void_reason, new.void_outcome) is distinct from (old.voided_at, old.void_reason, old.void_outcome) then
      raise exception 'Void details can only be set by voiding the entry.' using errcode = 'ZM5M2';
    end if;
    return new;
  end if;
  if coalesce(current_setting('zmr.mortgage_void', true), '') = 'on' then
    return new;  -- the void function already did the work
  end if;
  -- an older page's plain UPDATE voided=true: same conditional core, refusals raised (nothing kept)
  outcome := public.mortgage_void_core(case when tg_table_name = 'mortgage_payments' then 'payment' else 'escrow' end,
                                       to_jsonb(old), true);
  new.void_outcome := outcome;
  new.voided_at := coalesce(new.voided_at, now());
  return new;
end;
$$;
create trigger mortgage_payments_activity_guard
  before update on mortgage_payments
  for each row execute function mortgage_activity_guard();
create trigger mortgage_escrow_transactions_activity_guard
  before update on mortgage_escrow_transactions
  for each row execute function mortgage_activity_guard();

create or replace function mortgage_activity_no_delete()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'Mortgage entries are never deleted. Void the entry instead.' using errcode = 'ZM5M2';
end;
$$;
create trigger mortgage_payments_no_delete before delete on mortgage_payments
  for each row execute function mortgage_activity_no_delete();
create trigger mortgage_escrow_transactions_no_delete before delete on mortgage_escrow_transactions
  for each row execute function mortgage_activity_no_delete();

-- ---------------------------------------------------------------------------------------------------------------
-- 8. Void (current app): membership check, loan lock then entry lock, conditional core. Refusals are recorded with
--    their review cause and returned (entry stays active).
-- ---------------------------------------------------------------------------------------------------------------
create or replace function void_mortgage_activity(p_kind text, p_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  r jsonb;
  m uuid;
  acct uuid;
  prop uuid;
  outcome text;
begin
  if p_kind = 'payment' then
    select mortgage_id, account_id, property_id into m, acct, prop from public.mortgage_payments where id = p_id;
  elsif p_kind = 'escrow' then
    select mortgage_id, account_id, property_id into m, acct, prop from public.mortgage_escrow_transactions where id = p_id;
  else
    raise exception 'Unknown mortgage activity kind %.', p_kind using errcode = '22023';
  end if;
  if acct is null or not public.is_account_member(acct) then
    raise exception 'Mortgage entry not found.' using errcode = 'P0002';
  end if;
  -- lock order: the loan (or, for an unlinked entry, the property's active loan) first, then the entry
  if m is not null then
    perform 1 from public.mortgage_details where id = m for update;
  else
    perform 1 from public.mortgage_details where property_id = prop and not voided for update;
  end if;
  if p_kind = 'payment' then
    select to_jsonb(x) into r from public.mortgage_payments x where id = p_id for update;
  else
    select to_jsonb(x) into r from public.mortgage_escrow_transactions x where id = p_id for update;
  end if;
  if (r->>'voided')::boolean then
    return jsonb_build_object('outcome', 'already_voided', 'voided', true, 'void_outcome', r->>'void_outcome');
  end if;
  outcome := public.mortgage_void_core(p_kind, r, false);
  if outcome like 'refused_%' then
    return jsonb_build_object('outcome', outcome, 'voided', false);
  end if;
  perform set_config('zmr.mortgage_void', 'on', true);
  if p_kind = 'payment' then
    update public.mortgage_payments set voided = true, voided_at = now(), void_reason = p_reason, void_outcome = outcome where id = p_id;
  else
    update public.mortgage_escrow_transactions set voided = true, voided_at = now(), void_reason = p_reason, void_outcome = outcome where id = p_id;
  end if;
  perform set_config('zmr.mortgage_void', 'off', true);
  return jsonb_build_object('outcome', outcome, 'voided', true);
end;
$$;
revoke all on function void_mortgage_activity(text, uuid, text) from public, anon;
grant execute on function void_mortgage_activity(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 9. Versioned balance update (manual edit or statement confirmation). M7: only the versions of the balances being
--    updated are checked. A same-value update is a deliberate confirmation (reset counter moves). The statement date
--    is stored when given (otherwise unknown); the figure-entered time is now. B2: resolves ONLY the cause ids passed
--    (the ones the person was shown), for this loan and the balances updated; never unlinked legacy causes.
-- ---------------------------------------------------------------------------------------------------------------
create or replace function reset_mortgage_balance(
  p_mortgage_id uuid,
  p_principal numeric default null, p_expected_principal_version bigint default null,
  p_escrow numeric default null, p_expected_escrow_version bigint default null,
  p_statement_date date default null,
  p_resolve_cause_ids uuid[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  l public.mortgage_details%rowtype;
  eff_id uuid;
  old_principal numeric(12, 2);
  old_escrow numeric(12, 2);
begin
  if p_principal is null and p_escrow is null then
    raise exception 'Nothing to update.' using errcode = '22023';
  end if;
  if (p_principal is not null and p_expected_principal_version is null)
     or (p_escrow is not null and p_expected_escrow_version is null) then
    raise exception 'A balance update must say which version of that balance it was based on.' using errcode = '22023';
  end if;
  if (p_principal is not null and p_principal < 0) or (p_escrow is not null and p_escrow < 0) then
    raise exception 'A balance can''t be negative.' using errcode = '22023';
  end if;
  if p_statement_date > current_date then
    raise exception 'A statement date can''t be in the future.' using errcode = '22023';
  end if;

  select * into l from public.mortgage_details where id = p_mortgage_id for update;
  if not found or not public.is_account_member(l.account_id) then
    raise exception 'Mortgage not found.' using errcode = 'P0002';
  end if;
  if l.voided then
    raise exception 'This mortgage is inactive; its balances are kept as they were.' using errcode = 'ZM5M7';
  end if;
  if (p_principal is not null and l.principal_version <> p_expected_principal_version)
     or (p_escrow is not null and l.escrow_version <> p_expected_escrow_version) then
    raise exception 'The balance changed since you opened this form (a payment, escrow entry or another edit). Your entries were not saved. Reload, compare with your statement, then save again.'
      using errcode = 'ZM5M5';
  end if;
  old_principal := l.current_balance;
  old_escrow := l.escrow_balance;

  update public.mortgage_details
     set current_balance = coalesce(p_principal, current_balance),
         escrow_balance = case when p_escrow is null then escrow_balance else p_escrow end,
         principal_epoch = principal_epoch + case when p_principal is null then 0 else 1 end,
         escrow_epoch = escrow_epoch + case when p_escrow is null then 0 else 1 end,
         principal_version = principal_version + case when p_principal is null then 0 else 1 end,
         escrow_version = escrow_version + case when p_escrow is null then 0 else 1 end,
         principal_as_of = case when p_principal is null then principal_as_of else p_statement_date end,
         escrow_as_of = case when p_escrow is null then escrow_as_of else p_statement_date end,
         principal_figure_at = case when p_principal is null then principal_figure_at else now() end,
         escrow_figure_at = case when p_escrow is null then escrow_figure_at else now() end,
         updated_at = now()
   where id = l.id
   returning * into l;

  insert into public.mortgage_balance_effects
    (account_id, property_id, mortgage_id, source_kind, source_id, effect, principal_delta, escrow_delta,
     principal_epoch, escrow_epoch, reason, statement_date)
  values (l.account_id, l.property_id, l.id, 'reset', gen_random_uuid(), 'reset',
          l.current_balance - old_principal, coalesce(l.escrow_balance, 0) - coalesce(old_escrow, 0),
          l.principal_epoch, l.escrow_epoch,
          concat_ws(',', case when p_principal is not null then 'principal' end, case when p_escrow is not null then 'escrow' end),
          p_statement_date)
  returning id into eff_id;

  update public.mortgage_balance_review_causes
     set resolved_at = now(), resolved_by = auth.uid(),
         resolution = case
           when balance_kind = 'principal' and p_principal = old_principal then 'confirmed'
           when balance_kind = 'escrow' and p_escrow is not distinct from old_escrow then 'confirmed'
           else 'reset' end,
         resolved_by_effect = eff_id
   where id = any (coalesce(p_resolve_cause_ids, '{}'))
     and review_mortgage_id = l.id and resolved_at is null
     and cause <> 'skipped_unlinked_legacy'
     and ((balance_kind = 'principal' and p_principal is not null) or (balance_kind = 'escrow' and p_escrow is not null));

  return jsonb_build_object('principal_version', l.principal_version, 'escrow_version', l.escrow_version,
                            'current_balance', l.current_balance, 'escrow_balance', l.escrow_balance);
end;
$$;
revoke all on function reset_mortgage_balance(uuid, numeric, bigint, numeric, bigint, date, uuid[]) from public, anon;
grant execute on function reset_mortgage_balance(uuid, numeric, bigint, numeric, bigint, date, uuid[]) to authenticated;

-- An unlinked legacy cause (no loan link was ever recorded) is resolved only by an explicit acknowledgement.
create or replace function acknowledge_mortgage_review_cause(p_cause_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  c public.mortgage_balance_review_causes%rowtype;
begin
  select * into c from public.mortgage_balance_review_causes where id = p_cause_id for update;
  if not found or not public.is_account_member(c.account_id) then
    raise exception 'Review item not found.' using errcode = 'P0002';
  end if;
  if c.cause <> 'skipped_unlinked_legacy' then
    raise exception 'This review is resolved by confirming or updating the balance.' using errcode = 'ZM5M9';
  end if;
  update public.mortgage_balance_review_causes
     set resolved_at = now(), resolved_by = auth.uid(), resolution = 'acknowledged'
   where id = p_cause_id and resolved_at is null;
end;
$$;
revoke all on function acknowledge_mortgage_review_cause(uuid) from public, anon;
grant execute on function acknowledge_mortgage_review_cause(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 10. Audit: both activity tables join the generic audit trail. The table-name check is extended ADDITIVELY from
--     whatever the live constraint already allows, so it can't drop another migration's entries.
-- ---------------------------------------------------------------------------------------------------------------
do $$
declare
  existing text[];
  def text;
begin
  select pg_get_constraintdef(oid) into def from pg_constraint
   where conrelid = 'public.audit_log'::regclass and conname = 'audit_log_table_name_check';
  select array_agg(distinct m[1]) into existing from regexp_matches(coalesce(def, ''), '''([a-z_]+)''', 'g') as m;
  existing := array(select distinct x from unnest(coalesce(existing, '{}') || array['mortgage_payments', 'mortgage_escrow_transactions']) as x order by 1);
  if def is not null then
    execute 'alter table public.audit_log drop constraint audit_log_table_name_check';
  end if;
  execute format('alter table public.audit_log add constraint audit_log_table_name_check check (table_name = any (%L::text[]))', existing);
end;
$$;
create trigger mortgage_payments_audit_log
  after insert or update on mortgage_payments
  for each row execute function log_audit_changes();
create trigger mortgage_escrow_transactions_audit_log
  after insert or update on mortgage_escrow_transactions
  for each row execute function log_audit_changes();
