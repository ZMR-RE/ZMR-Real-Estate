-- Mortgage balance integrity (T1; owner-approved 2026-10-01: "Yes, build the mortgage integrity fix with those choices").
-- Contract: docs/planning/mortgage/ZMR-mortgage-balance-integrity-contract.md (v2, bed4174) with the owner's binding choices:
--   1. inactive/replaced loans keep frozen balances, no review item solely for being inactive;
--   2. balance edits from older browsers (plain UPDATE of the balance columns) are REFUSED; reload required;
--   3. reversals above the original loan amount are refused and create a review cause.
--
-- Fixes, with T3's reproduction (docs/planning/mortgage/evidence/t3-mortgage-concurrency-2026-10-01/) as the
-- negative control:
--   D1 unlocked read-modify-write in the insert triggers (lost updates, bypassed guards) -> loan row locked FOR UPDATE;
--   D2 a void never reversed its balance effect -> conditional, exactly-once reversal;
--   D3 no loan reference on entries -> mortgage_id set server-side on every new entry;
--   D4 absolute balance edits with no stale check -> versioned reset function only; per-balance epochs;
--   D5 no audit / editable facts -> immutable facts, one-way void, audit triggers, append-only effects ledger.
--
-- Data impact: no existing activity row, balance or loan is changed. Pre-existing entries stay mortgage_id NULL
-- ("unlinked legacy property activity"): no backfill, no guessed links, no historical correction.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------------------------------------------
alter table mortgage_details
  add column balance_version bigint not null default 0,
  add column principal_epoch integer not null default 0,
  add column escrow_epoch integer not null default 0;

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
-- 2. Append-only balance-effects ledger (audit trail + exactly-once key). Written only by the functions below.
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
-- A reversal (or a recorded skip) can happen at most once per entry; refusals may repeat.
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
-- 3. Review causes behind the Action Queue "Mortgage balance review" item (one open item per loan, derived from
--    its open causes). Principal and escrow causes resolve independently.
-- ---------------------------------------------------------------------------------------------------------------
create table mortgage_balance_review_causes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  -- the loan whose balance should be checked (for unlinked legacy entries: the property's active loan at void time;
  -- a review target, not a claim that the entry belonged to it)
  review_mortgage_id uuid not null references mortgage_details(id),
  balance_kind text not null check (balance_kind in ('principal', 'escrow')),
  cause text not null check (cause in
    ('skipped_reset_after_entry', 'skipped_unlinked_legacy', 'refused_negative_escrow', 'refused_over_original')),
  source_kind text not null check (source_kind in ('payment', 'escrow')),
  source_id uuid not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution text check (resolution in ('reset', 'confirmed')),
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

-- ---------------------------------------------------------------------------------------------------------------
-- 4. Loan row guard: balances and their counters change only through these functions/triggers.
--    An older browser's edit form always resends both balances; a CHANGED value is refused (owner choice 2).
-- ---------------------------------------------------------------------------------------------------------------
create or replace function mortgage_details_balance_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.balance_version := 0;
    new.principal_epoch := 0;
    new.escrow_epoch := 0;
    return new;
  end if;

  if coalesce(current_setting('zmr.mortgage_internal', true), '') = 'on' then
    return new;
  end if;

  if new.current_balance is distinct from old.current_balance
     or new.escrow_balance is distinct from old.escrow_balance then
    raise exception 'This page is out of date and can''t change the mortgage balance. Copy any unsaved changes, reload the page, then try again. Nothing was saved.'
      using errcode = 'ZM5M6';
  end if;

  if new.balance_version is distinct from old.balance_version
     or new.principal_epoch is distinct from old.principal_epoch
     or new.escrow_epoch is distinct from old.escrow_epoch then
    raise exception 'Mortgage balance counters can''t be changed directly.' using errcode = 'ZM5M6';
  end if;

  return new;
end;
$$;

create trigger mortgage_details_balance_guard
  before insert or update on mortgage_details
  for each row execute function mortgage_details_balance_guard();

-- ---------------------------------------------------------------------------------------------------------------
-- 5. New entries: lock the active loan, validate against the locked value, link, apply, record. Replaces the
--    unlocked AFTER INSERT triggers (T3 C1–C4).
-- ---------------------------------------------------------------------------------------------------------------
drop trigger if exists mortgage_payments_apply_to_balance on mortgage_payments;
drop trigger if exists mortgage_escrow_transactions_apply_to_balance on mortgage_escrow_transactions;

create or replace function mortgage_payment_apply_locked()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l mortgage_details%rowtype;
begin
  select * into l from mortgage_details where property_id = new.property_id and not voided for update;
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

  perform set_config('zmr.mortgage_internal', 'on', true);
  update mortgage_details
     set current_balance = l.current_balance - new.principal_amount,
         balance_version = l.balance_version + 1,
         updated_at = now()
   where id = l.id;
  perform set_config('zmr.mortgage_internal', 'off', true);

  insert into mortgage_balance_effects
    (account_id, property_id, mortgage_id, source_kind, source_id, effect, principal_delta, principal_epoch, escrow_epoch)
  values (new.account_id, new.property_id, l.id, 'payment', new.id, 'applied', -new.principal_amount, l.principal_epoch, l.escrow_epoch);
  return new;
end;
$$;

create or replace function mortgage_escrow_apply_locked()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l mortgage_details%rowtype;
  before_escrow numeric(12, 2);
  delta numeric(12, 2);
begin
  select * into l from mortgage_details where property_id = new.property_id and not voided for update;
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

  perform set_config('zmr.mortgage_internal', 'on', true);
  update mortgage_details
     set escrow_balance = before_escrow + delta,
         balance_version = l.balance_version + 1,
         updated_at = now()
   where id = l.id;
  perform set_config('zmr.mortgage_internal', 'off', true);

  insert into mortgage_balance_effects
    (account_id, property_id, mortgage_id, source_kind, source_id, effect, escrow_delta, principal_epoch, escrow_epoch)
  values (new.account_id, new.property_id, l.id, 'escrow', new.id, 'applied', delta, l.principal_epoch, l.escrow_epoch);
  return new;
end;
$$;

create trigger mortgage_payments_apply_locked
  before insert on mortgage_payments
  for each row execute function mortgage_payment_apply_locked();
create trigger mortgage_escrow_transactions_apply_locked
  before insert on mortgage_escrow_transactions
  for each row execute function mortgage_escrow_apply_locked();

-- ---------------------------------------------------------------------------------------------------------------
-- 6. Conditional, exactly-once void (shared by the void function and the older-browser UPDATE path).
--    Returns the outcome; refusals either raise (older browser: nothing is kept) or are recorded and returned
--    (void function: refusal + review cause commit together, entry stays unvoided).
-- ---------------------------------------------------------------------------------------------------------------
create or replace function mortgage_void_core(
  p_kind text, p_id uuid, p_account uuid, p_property uuid, p_mortgage uuid,
  p_principal numeric, p_amount numeric, p_type text, p_raise boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l mortgage_details%rowtype;
  a mortgage_balance_effects%rowtype;
  active_id uuid;
  kind text := case when p_kind = 'payment' then 'principal' else 'escrow' end;
  delta numeric(12, 2);
  new_value numeric(12, 2);
begin
  -- Unlinked legacy entry: which loan it affected was never recorded, so nothing is adjusted.
  if p_mortgage is null then
    insert into mortgage_balance_effects (account_id, property_id, source_kind, source_id, effect, reason)
    values (p_account, p_property, p_kind, p_id, 'reversal_skipped', 'unlinked_legacy')
    on conflict do nothing;
    select id into active_id from mortgage_details where property_id = p_property and not voided;
    if active_id is not null then
      insert into mortgage_balance_review_causes
        (account_id, property_id, review_mortgage_id, balance_kind, cause, source_kind, source_id)
      values (p_account, p_property, active_id, kind, 'skipped_unlinked_legacy', p_kind, p_id)
      on conflict do nothing;
    end if;
    return 'skipped_unlinked_legacy';
  end if;

  select * into l from mortgage_details where id = p_mortgage for update;

  -- Inactive/replaced loan: frozen; the replacement is never touched; no review cause (owner choice 1).
  if l.voided then
    insert into mortgage_balance_effects (account_id, property_id, mortgage_id, source_kind, source_id, effect, reason)
    values (p_account, p_property, l.id, p_kind, p_id, 'reversal_skipped', 'loan_inactive')
    on conflict do nothing;
    return 'skipped_loan_inactive';
  end if;

  select * into a from mortgage_balance_effects
   where source_kind = p_kind and source_id = p_id and effect = 'applied';
  if not found then
    raise exception 'No recorded balance effect for this entry.' using errcode = 'ZM5M8';
  end if;

  -- A reset of this balance since the entry: the reset may already include or exclude it; never guessed.
  if (kind = 'principal' and l.principal_epoch <> a.principal_epoch)
     or (kind = 'escrow' and l.escrow_epoch <> a.escrow_epoch) then
    insert into mortgage_balance_effects
      (account_id, property_id, mortgage_id, source_kind, source_id, effect, reason, principal_epoch, escrow_epoch)
    values (p_account, p_property, l.id, p_kind, p_id, 'reversal_skipped', 'reset_after_entry', l.principal_epoch, l.escrow_epoch)
    on conflict do nothing;
    insert into mortgage_balance_review_causes
      (account_id, property_id, review_mortgage_id, balance_kind, cause, source_kind, source_id)
    values (p_account, p_property, l.id, kind, 'skipped_reset_after_entry', p_kind, p_id)
    on conflict do nothing;
    return 'skipped_reset_after_entry';
  end if;

  if kind = 'principal' then
    delta := p_principal;
    new_value := l.current_balance + delta;
    if new_value > l.original_loan_amount then
      if p_raise then
        raise exception 'Voiding this payment would raise the balance above the original loan amount (%). Nothing was changed; check the balance against your statement.', l.original_loan_amount
          using errcode = 'ZM5M4';
      end if;
      insert into mortgage_balance_effects (account_id, property_id, mortgage_id, source_kind, source_id, effect, principal_delta, reason)
      values (p_account, p_property, l.id, p_kind, p_id, 'void_refused', delta, 'over_original');
      insert into mortgage_balance_review_causes
        (account_id, property_id, review_mortgage_id, balance_kind, cause, source_kind, source_id)
      values (p_account, p_property, l.id, kind, 'refused_over_original', p_kind, p_id)
      on conflict do nothing;
      return 'refused_over_original';
    end if;
  else
    delta := case when p_type = 'deposit' then -p_amount else p_amount end;
    new_value := coalesce(l.escrow_balance, 0) + delta;
    if new_value < 0 then
      if p_raise then
        raise exception 'Not voided: a later disbursement used this deposit, so voiding it would make escrow negative. Void that disbursement first, or reset escrow from a statement.'
          using errcode = 'ZM5M3';
      end if;
      insert into mortgage_balance_effects (account_id, property_id, mortgage_id, source_kind, source_id, effect, escrow_delta, reason)
      values (p_account, p_property, l.id, p_kind, p_id, 'void_refused', delta, 'negative_escrow');
      insert into mortgage_balance_review_causes
        (account_id, property_id, review_mortgage_id, balance_kind, cause, source_kind, source_id)
      values (p_account, p_property, l.id, kind, 'refused_negative_escrow', p_kind, p_id)
      on conflict do nothing;
      return 'refused_negative_escrow';
    end if;
  end if;

  perform set_config('zmr.mortgage_internal', 'on', true);
  if kind = 'principal' then
    update mortgage_details set current_balance = new_value, balance_version = l.balance_version + 1, updated_at = now() where id = l.id;
  else
    update mortgage_details set escrow_balance = new_value, balance_version = l.balance_version + 1, updated_at = now() where id = l.id;
  end if;
  perform set_config('zmr.mortgage_internal', 'off', true);

  insert into mortgage_balance_effects
    (account_id, property_id, mortgage_id, source_kind, source_id, effect, principal_delta, escrow_delta, principal_epoch, escrow_epoch)
  values (p_account, p_property, l.id, p_kind, p_id, 'reversed',
          case when kind = 'principal' then delta else 0 end, case when kind = 'escrow' then delta else 0 end,
          l.principal_epoch, l.escrow_epoch);
  return 'reversed';
end;
$$;
revoke all on function mortgage_void_core(text, uuid, uuid, uuid, uuid, numeric, numeric, text, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 7. Immutable facts and one-way void on both activity tables. A plain UPDATE voided=true (older browsers) runs the
--    same core with refusals raised; the void function sets zmr.mortgage_void after doing the work itself.
-- ---------------------------------------------------------------------------------------------------------------
create or replace function mortgage_activity_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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
    -- repeated void: idempotent, keeps the original void record
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

  -- false -> true
  if coalesce(current_setting('zmr.mortgage_void', true), '') = 'on' then
    return new;
  end if;
  if tg_table_name = 'mortgage_payments' then
    outcome := mortgage_void_core('payment', old.id, old.account_id, old.property_id, old.mortgage_id,
                                  old.principal_amount, old.amount, null, true);
  else
    outcome := mortgage_void_core('escrow', old.id, old.account_id, old.property_id, old.mortgage_id,
                                  null, old.amount, old.transaction_type, true);
  end if;
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

-- Hard deletes were never part of the app; refuse them so the effects trail can't be orphaned.
create or replace function mortgage_activity_no_delete()
returns trigger
language plpgsql
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
-- 8. Void function for the current frontend: lock the loan, then the entry; refusals are recorded with their review
--    cause and returned (the entry is NOT voided); successes void the entry with its outcome.
-- ---------------------------------------------------------------------------------------------------------------
create or replace function void_mortgage_activity(p_kind text, p_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p mortgage_payments%rowtype;
  e mortgage_escrow_transactions%rowtype;
  outcome text;
begin
  if p_kind = 'payment' then
    select * into p from mortgage_payments where id = p_id;
    if not found or not is_account_member(p.account_id) then
      raise exception 'Mortgage payment not found.' using errcode = 'P0002';
    end if;
    if p.mortgage_id is not null then
      perform 1 from mortgage_details where id = p.mortgage_id for update;
    end if;
    select * into p from mortgage_payments where id = p_id for update;
    if p.voided then
      return jsonb_build_object('outcome', 'already_voided', 'voided', true, 'void_outcome', p.void_outcome);
    end if;
    outcome := mortgage_void_core('payment', p.id, p.account_id, p.property_id, p.mortgage_id,
                                  p.principal_amount, p.amount, null, false);
    if outcome like 'refused_%' then
      return jsonb_build_object('outcome', outcome, 'voided', false);
    end if;
    perform set_config('zmr.mortgage_void', 'on', true);
    update mortgage_payments
       set voided = true, voided_at = now(), void_reason = p_reason, void_outcome = outcome
     where id = p.id;
    perform set_config('zmr.mortgage_void', 'off', true);
  elsif p_kind = 'escrow' then
    select * into e from mortgage_escrow_transactions where id = p_id;
    if not found or not is_account_member(e.account_id) then
      raise exception 'Escrow entry not found.' using errcode = 'P0002';
    end if;
    if e.mortgage_id is not null then
      perform 1 from mortgage_details where id = e.mortgage_id for update;
    end if;
    select * into e from mortgage_escrow_transactions where id = p_id for update;
    if e.voided then
      return jsonb_build_object('outcome', 'already_voided', 'voided', true, 'void_outcome', e.void_outcome);
    end if;
    outcome := mortgage_void_core('escrow', e.id, e.account_id, e.property_id, e.mortgage_id,
                                  null, e.amount, e.transaction_type, false);
    if outcome like 'refused_%' then
      return jsonb_build_object('outcome', outcome, 'voided', false);
    end if;
    perform set_config('zmr.mortgage_void', 'on', true);
    update mortgage_escrow_transactions
       set voided = true, voided_at = now(), void_reason = p_reason, void_outcome = outcome
     where id = e.id;
    perform set_config('zmr.mortgage_void', 'off', true);
  else
    raise exception 'Unknown mortgage activity kind %.', p_kind;
  end if;
  return jsonb_build_object('outcome', outcome, 'voided', true);
end;
$$;
revoke all on function void_mortgage_activity(text, uuid, text) from public, anon;
grant execute on function void_mortgage_activity(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 9. Versioned balance reset (manual edit or statement confirmation). A same-value submission is a deliberate
--    confirmation and counts as a reset of that balance. A stale form (version moved) is refused. Resolving one
--    balance never resolves the other balance's review causes.
-- ---------------------------------------------------------------------------------------------------------------
create or replace function reset_mortgage_balance(
  p_mortgage_id uuid, p_expected_version bigint,
  p_principal numeric default null, p_escrow numeric default null, p_statement_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l mortgage_details%rowtype;
  eff_id uuid;
  old_principal numeric(12, 2);
  old_escrow numeric(12, 2);
begin
  if p_principal is null and p_escrow is null then
    raise exception 'Nothing to reset.' using errcode = '22023';
  end if;
  if (p_principal is not null and p_principal < 0) or (p_escrow is not null and p_escrow < 0) then
    raise exception 'A balance can''t be negative.' using errcode = '22023';
  end if;

  select * into l from mortgage_details where id = p_mortgage_id for update;
  if not found or not is_account_member(l.account_id) then
    raise exception 'Mortgage not found.' using errcode = 'P0002';
  end if;
  if l.voided then
    raise exception 'This mortgage is inactive; its balances are kept as they were.' using errcode = 'ZM5M7';
  end if;
  if l.balance_version <> p_expected_version then
    raise exception 'The balance changed since you opened this form (a payment, escrow entry or another edit). Your entries were not saved. Reload, compare with your statement, then save again.'
      using errcode = 'ZM5M5';
  end if;
  old_principal := l.current_balance;
  old_escrow := l.escrow_balance;

  perform set_config('zmr.mortgage_internal', 'on', true);
  update mortgage_details
     set current_balance = coalesce(p_principal, current_balance),
         escrow_balance = case when p_escrow is null then escrow_balance else p_escrow end,
         principal_epoch = principal_epoch + case when p_principal is null then 0 else 1 end,
         escrow_epoch = escrow_epoch + case when p_escrow is null then 0 else 1 end,
         balance_version = balance_version + 1,
         updated_at = now()
   where id = l.id
   returning * into l;
  perform set_config('zmr.mortgage_internal', 'off', true);

  insert into mortgage_balance_effects
    (account_id, property_id, mortgage_id, source_kind, source_id, effect, principal_delta, escrow_delta,
     principal_epoch, escrow_epoch, reason, statement_date)
  values (l.account_id, l.property_id, l.id, 'reset', gen_random_uuid(), 'reset',
          l.current_balance - old_principal,
          coalesce(l.escrow_balance, 0) - coalesce(old_escrow, 0),
          l.principal_epoch, l.escrow_epoch,
          concat_ws(',', case when p_principal is not null then 'principal' end, case when p_escrow is not null then 'escrow' end),
          p_statement_date)
  returning id into eff_id;

  update mortgage_balance_review_causes
     set resolved_at = now(), resolved_by = auth.uid(), resolution = 'reset', resolved_by_effect = eff_id
   where review_mortgage_id = l.id and resolved_at is null
     and ((balance_kind = 'principal' and p_principal is not null) or (balance_kind = 'escrow' and p_escrow is not null));

  return jsonb_build_object('balance_version', l.balance_version, 'current_balance', l.current_balance,
                            'escrow_balance', l.escrow_balance);
end;
$$;
revoke all on function reset_mortgage_balance(uuid, bigint, numeric, numeric, date) from public, anon;
grant execute on function reset_mortgage_balance(uuid, bigint, numeric, numeric, date) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 10. Audit: both activity tables join the existing generic audit trail.
-- ---------------------------------------------------------------------------------------------------------------
alter table audit_log drop constraint audit_log_table_name_check;
alter table audit_log add constraint audit_log_table_name_check
  check (table_name in ('properties', 'llcs', 'mortgage_details', 'financial_transactions', 'financial_periods',
                        'contacts', 'contact_methods', 'contact_links', 'mortgage_payments', 'mortgage_escrow_transactions'));
create trigger mortgage_payments_audit_log
  after insert or update on mortgage_payments
  for each row execute function log_audit_changes();
create trigger mortgage_escrow_transactions_audit_log
  after insert or update on mortgage_escrow_transactions
  for each row execute function log_audit_changes();
