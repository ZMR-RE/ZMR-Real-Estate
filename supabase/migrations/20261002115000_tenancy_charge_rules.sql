-- T4 Stage 1 — reusable tenancy billing rules (owner-approved within Stage 1).
-- Structured records on the tenancy (NOT private agent instructions); edited
-- in Tenancy & billing and in the assistant's Workload — both write these
-- same rows.
--
--   fixed_recurring     same amount every period while effective
--                       (e.g. a $60 pest-control reimbursement, recorded as
--                       half of a $120 monthly cost — basis kept for clarity)
--   variable_statement  a share of a bill that varies (e.g. 50% of a gas
--                       bill). Billed only from an entered statement; a
--                       missing statement stays UNRESOLVED — never estimated
--   one_time            a manual charge (+) or credit (−) for one period,
--                       reviewed on the draft like any other line
--
-- Duplicate prevention: one invoice per tenancy and period already makes a
-- fixed rule bill once per period; statements and one-time rules carry the
-- invoice they were billed on and are skipped once billed. Rejecting or
-- cancelling that invoice releases them.
-- Error codes ZM360–ZM369.

create table tenancy_charge_rules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  kind text not null check (kind in ('fixed_recurring', 'variable_statement', 'one_time')),
  description text not null check (length(trim(description)) > 0),
  amount numeric(10, 2),
  basis_total numeric(10, 2) check (basis_total is null or basis_total > 0),
  share_percent numeric(5, 2) check (share_percent is null or (share_percent > 0 and share_percent <= 100)),
  effective_from date,
  effective_to date,
  one_time_period date,
  applied_invoice_id uuid references invoices(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  notes text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint charge_rule_dates check (effective_to is null or effective_from is null or effective_to >= effective_from),
  -- coalesce(..., false): a missing value must fail the check, not pass it
  -- as "unknown".
  constraint charge_rule_shape check (coalesce(
    (kind = 'fixed_recurring' and amount is not null and amount > 0 and one_time_period is null)
    or (kind = 'variable_statement' and amount is null and share_percent is not null and basis_total is null and one_time_period is null)
    or (kind = 'one_time' and amount is not null and amount <> 0 and one_time_period is not null and share_percent is null and basis_total is null),
    false)),
  constraint charge_rule_one_time_first_of_month check (one_time_period is null or one_time_period = date_trunc('month', one_time_period)::date)
);
create index tenancy_charge_rules_lease_idx on tenancy_charge_rules (lease_id);

-- A variable bill for one service month, with its statement document.
create table tenancy_charge_statements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  rule_id uuid not null references tenancy_charge_rules(id) on delete cascade,
  service_period_start date not null check (service_period_start = date_trunc('month', service_period_start)::date),
  statement_amount numeric(10, 2) not null check (statement_amount > 0),
  document_id uuid references documents(id) on delete restrict,
  billed_invoice_id uuid references invoices(id) on delete set null,
  entered_at timestamptz not null default now(),
  entered_by uuid references auth.users(id) default auth.uid(),
  unique (rule_id, service_period_start)
);

alter table invoice_lines
  add column rule_id uuid references tenancy_charge_rules(id) on delete set null,
  add column statement_id uuid references tenancy_charge_statements(id) on delete set null;

alter table tenancy_charge_rules enable row level security;
alter table tenancy_charge_statements enable row level security;
create policy "members manage their charge rules" on tenancy_charge_rules for all
  using (is_account_member(account_id)) with check (is_account_member(account_id));
create policy "members manage their charge statements" on tenancy_charge_statements for all
  using (is_account_member(account_id)) with check (is_account_member(account_id));

create or replace function charge_rules_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from leases where id = new.lease_id and account_id = new.account_id) then
    raise exception 'Charge rules must belong to the tenancy''s account' using errcode = 'ZM360';
  end if;
  if tg_op = 'UPDATE' then
    -- Billing bookkeeping is set only by the invoice actions.
    if new.applied_invoice_id is distinct from old.applied_invoice_id and not invoice_op_active() then
      raise exception 'Only invoice drafting sets where a one-time charge was billed' using errcode = 'ZM361';
    end if;
    if old.applied_invoice_id is not null and not invoice_op_active()
       and (new.amount, new.one_time_period, new.kind) is distinct from (old.amount, old.one_time_period, old.kind) then
      raise exception 'This one-time charge is already on an invoice; change it on that invoice or reject the draft first' using errcode = 'ZM362';
    end if;
    new.version = old.version + 1;
  elsif new.applied_invoice_id is not null then
    raise exception 'Only invoice drafting sets where a one-time charge was billed' using errcode = 'ZM361';
  end if;
  new.updated_at = now();
  return new;
end $$;

create trigger charge_rules_guard before insert or update on tenancy_charge_rules
  for each row execute function charge_rules_guard();

create or replace function charge_statements_guard() returns trigger language plpgsql set search_path = public as $$
declare r tenancy_charge_rules;
begin
  select * into r from tenancy_charge_rules where id = new.rule_id;
  if r.id is null or r.account_id <> new.account_id then
    raise exception 'Statement must belong to the rule''s account' using errcode = 'ZM360';
  end if;
  if r.kind <> 'variable_statement' then
    raise exception 'Statements are only entered for variable (statement-based) charges' using errcode = 'ZM363';
  end if;
  if new.document_id is not null and not exists (select 1 from documents where id = new.document_id and account_id = new.account_id) then
    raise exception 'The statement document must belong to the same account' using errcode = 'ZM360';
  end if;
  if tg_op = 'UPDATE' then
    if new.billed_invoice_id is distinct from old.billed_invoice_id and not invoice_op_active() then
      raise exception 'Only invoice drafting sets where a statement was billed' using errcode = 'ZM361';
    end if;
    if old.billed_invoice_id is not null and not invoice_op_active()
       and (new.statement_amount, new.service_period_start) is distinct from (old.statement_amount, old.service_period_start) then
      raise exception 'This statement is already on an invoice; reject that draft or revise the invoice first' using errcode = 'ZM362';
    end if;
  elsif new.billed_invoice_id is not null then
    raise exception 'Only invoice drafting sets where a statement was billed' using errcode = 'ZM361';
  end if;
  return new;
end $$;

create trigger charge_statements_guard before insert or update on tenancy_charge_statements
  for each row execute function charge_statements_guard();

-- Releasing billed statements/one-time charges when their invoice is
-- rejected or cancelled (so they bill on the next draft instead — never
-- twice, never lost).
create or replace function release_rule_billing(p_invoice_id uuid) returns void language plpgsql set search_path = public as $$
begin
  update tenancy_charge_statements set billed_invoice_id = null where billed_invoice_id = p_invoice_id;
  update tenancy_charge_rules set applied_invoice_id = null where applied_invoice_id = p_invoice_id;
end $$;

-- Rules whose tenancy is ending or has ended, or that passed their own end
-- date while still active: the owner reviews them at lease end/renewal
-- (a renewal is a new tenancy — rules never carry over silently).
create or replace function charge_rules_needing_review(p_lease_id uuid, p_today date default current_date)
returns table (rule_id uuid, reason text) language sql stable set search_path = public as $$
  select r.id,
         case
           when r.effective_to is not null and r.effective_to < p_today then 'The rule''s end date has passed'
           when l.end_date is not null and l.end_date < p_today then 'The tenancy has ended — review before any renewal'
           else 'The tenancy ends within 30 days — review for renewal'
         end
  from tenancy_charge_rules r join leases l on l.id = r.lease_id
  where r.lease_id = p_lease_id and r.status = 'active'
    and ((r.effective_to is not null and r.effective_to < p_today)
         or (l.end_date is not null and l.end_date - p_today <= 30))
$$;
