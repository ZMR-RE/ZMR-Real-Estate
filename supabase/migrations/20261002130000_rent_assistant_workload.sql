-- T4 Stage 1 — Rent & Payments Assistant workload (RP3 slice): the one
-- assistant per account, its tenancy assignments and its run history.
-- The assistant holds NO invoices of its own: drafting calls
-- create_invoice_draft, writing the same Rent ops `invoices` rows the owner's
-- manual path writes. Stage 1 runs are started manually by the owner — no
-- schedule, mailbox, sending, receipts or reminders.

create table agents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  kind text not null check (kind in ('rent_payments')),
  name text not null,
  status text not null default 'training' check (status in ('training', 'active', 'paused')),
  created_at timestamptz not null default now(),
  unique (account_id, kind)
);

create table agent_assignments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused')),
  -- RP3: tenant-specific note printed on this tenancy's invoices.
  invoice_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, lease_id)
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  kind text not null check (kind in ('draft_invoices')),
  period_start date not null,
  started_by uuid references auth.users(id) default auth.uid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text not null default 'running' check (outcome in ('running', 'completed', 'completed_with_skips', 'failed')),
  summary jsonb
);
-- One run at a time per assistant (double-clicks, two tabs).
create unique index agent_runs_one_active on agent_runs (agent_id) where finished_at is null;
create index agent_runs_agent_idx on agent_runs (agent_id, started_at desc);

alter table agents enable row level security;
alter table agent_assignments enable row level security;
alter table agent_runs enable row level security;
create policy "members can manage their agents" on agents for all
  using (is_account_member(account_id)) with check (is_account_member(account_id));
create policy "members can manage their agent assignments" on agent_assignments for all
  using (is_account_member(account_id)) with check (is_account_member(account_id));
create policy "members can manage their agent runs" on agent_runs for all
  using (is_account_member(account_id)) with check (is_account_member(account_id));

-- Runs are written only by run_assistant_invoice_drafts (trusted
-- provenance): no client can insert a run or mark a draft as the
-- assistant's.
create or replace function agent_runs_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.agent_op', true), '') <> 'on' then
    raise exception 'Assistant runs are recorded only by the assistant''s run action' using errcode = 'ZM356';
  end if;
  return coalesce(new, old);
end $$;

create trigger agent_runs_guard before insert or update or delete on agent_runs
  for each row execute function agent_runs_guard();

create or replace function agent_assignments_integrity() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from agents where id = new.agent_id and account_id = new.account_id)
     or not exists (select 1 from leases where id = new.lease_id and account_id = new.account_id) then
    raise exception 'Assignment, assistant and tenancy must belong to the same account' using errcode = 'ZM340';
  end if;
  new.updated_at = now();
  return new;
end $$;

create trigger agent_assignments_integrity before insert or update on agent_assignments
  for each row execute function agent_assignments_integrity();

-- Create (once) the account's Rent & Payments Assistant.
create or replace function ensure_rent_payments_agent(p_account_id uuid)
returns uuid language plpgsql set search_path = public as $$
declare v_id uuid;
begin
  if not is_account_member(p_account_id) then
    raise exception 'Not a member of this account' using errcode = 'ZM341';
  end if;
  insert into agents (account_id, kind, name) values (p_account_id, 'rent_payments', 'Rent & Payments Assistant')
    on conflict (account_id, kind) do nothing;
  select id into v_id from agents where account_id = p_account_id and kind = 'rent_payments';
  return v_id;
end $$;

-- Owner-started run: draft one month's invoices for every active assignment
-- that has complete billing information. Tenancies with missing information
-- or an existing invoice for the month are skipped and listed in the run
-- summary — nothing is guessed. Returns the run id.
create or replace function run_assistant_invoice_drafts(p_agent_id uuid, p_period_start date)
returns uuid language plpgsql set search_path = public as $$
declare
  a agents; r agent_runs; asg record;
  v_blockers text[]; v_invoice uuid;
  v_drafted jsonb := '[]'; v_skipped jsonb := '[]'; v_unresolved jsonb := '[]';
begin
  select * into a from agents where id = p_agent_id;
  -- Workspace validation: the caller must belong to the assistant's account
  -- (RLS already hides others'; checked explicitly as well).
  if a.id is null or not is_account_member(a.account_id) then
    raise exception 'Assistant not found' using errcode = 'ZM342';
  end if;
  perform invoice_require_owner(a.account_id);
  if a.status = 'paused' then raise exception 'The assistant is paused' using errcode = 'ZM343'; end if;
  perform set_config('app.agent_op', 'on', true);
  begin
    insert into agent_runs (account_id, agent_id, kind, period_start) values (a.account_id, a.id, 'draft_invoices', p_period_start)
      returning * into r;
  exception when unique_violation then
    raise exception 'A run is already in progress for this assistant' using errcode = 'ZM344';
  end;
  for asg in
    select aa.*, l.account_id as lease_account from agent_assignments aa join leases l on l.id = aa.lease_id
     where aa.agent_id = a.id and aa.status = 'active' order by aa.created_at
  loop
    if asg.lease_account <> a.account_id then
      v_skipped := v_skipped || jsonb_build_object('lease_id', asg.lease_id, 'blockers', '["other_workspace"]'::jsonb);
      continue;
    end if;
    v_blockers := get_invoice_draft_blockers(asg.lease_id, p_period_start);
    if cardinality(v_blockers) > 0 then
      v_skipped := v_skipped || jsonb_build_object('lease_id', asg.lease_id, 'blockers', to_jsonb(v_blockers));
    else
      v_invoice := invoicing_internal.create_draft_core(asg.lease_id, p_period_start, 'assistant', r.id, asg.invoice_note, null);
      v_drafted := v_drafted || jsonb_build_object('lease_id', asg.lease_id, 'invoice_id', v_invoice);
    end if;
    v_unresolved := v_unresolved || coalesce((select jsonb_agg(jsonb_build_object('lease_id', asg.lease_id, 'rule_id', u.rule_id,
                                                'description', u.description, 'service_period_start', u.service_period_start))
                                              from unresolved_variable_charges(asg.lease_id, p_period_start) u), '[]');
  end loop;
  update agent_runs set finished_at = now(),
         outcome = case when jsonb_array_length(v_skipped) > 0 or jsonb_array_length(v_unresolved) > 0 then 'completed_with_skips' else 'completed' end,
         summary = jsonb_build_object('drafted', v_drafted, 'skipped', v_skipped, 'unresolved_variable_charges', v_unresolved)
   where id = r.id;
  perform set_config('app.agent_op', 'off', true);
  return r.id;
end $$;
