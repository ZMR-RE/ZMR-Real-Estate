-- T4 Stage 1 — invoice actions, part 1: drafting, editing, approval.
-- Part 2 (issue, revise, cancel, sequence start) is 20261002125000.
-- The ONLY write path for invoices, their
-- lines, events and number sequences (see invoices_guard). Security
-- invoker: RLS applies to the caller, so every read/write is account-scoped.
-- Each function opens the write flag for its own transaction and closes it.

-- Draft one tenancy's invoice for a month from structured dashboard records
-- (lease rent, billing terms, property billing entity, billing recipients).
-- p_manual_amount is the owner's partial-month amount when prorating is
-- set to manual.
create or replace function create_invoice_draft(
  p_lease_id uuid,
  p_period_start date,
  p_created_via text default 'owner',
  p_agent_run_id uuid default null,
  p_visible_note text default null,
  p_manual_amount numeric default null
) returns uuid language plpgsql set search_path = public as $$
declare
  l leases; t lease_billing_terms; p properties; inv invoices;
  v_blockers text[];
  v_period_end date := (p_period_start + interval '1 month' - interval '1 day')::date;
  v_days_in_month int := extract(day from v_period_end)::int;
  v_from date; v_to date; v_active_days int;
  v_kind text := 'rent'; v_amount numeric(10, 2); v_desc text;
  v_names text; v_emails text;
begin
  v_blockers := get_invoice_draft_blockers(p_lease_id, p_period_start);
  if p_manual_amount is not null then
    v_blockers := array_remove(v_blockers, 'prorate_manual');
  end if;
  if cardinality(v_blockers) > 0 then
    raise exception 'This tenancy can''t be drafted yet: %', array_to_string(v_blockers, ', ')
      using errcode = 'ZM320', detail = array_to_string(v_blockers, ',');
  end if;
  if p_created_via not in ('owner', 'assistant') then
    raise exception 'Unknown creation path' using errcode = 'ZM321';
  end if;

  select * into l from leases where id = p_lease_id;
  select * into t from lease_billing_terms where lease_id = l.id;
  select * into p from properties where id = l.property_id;

  v_from := greatest(coalesce(t.effective_from, l.start_date), p_period_start);
  v_to := least(coalesce(t.effective_to, l.end_date, v_period_end), v_period_end);
  v_active_days := v_to - v_from + 1;
  v_amount := l.rent_amount;
  v_desc := 'Rent — ' || to_char(p_period_start, 'FMMonth YYYY');
  if v_active_days < v_days_in_month then
    if p_manual_amount is not null then
      v_kind := 'prorated_rent';
      v_amount := round(p_manual_amount, 2);
      v_desc := 'Rent — ' || to_char(v_from, 'FMMon FMDD') || '–' || to_char(v_to, 'FMMon FMDD, YYYY') || ' (partial month)';
    elsif t.prorate_rule = 'daily' then
      v_kind := 'prorated_rent';
      v_amount := round(l.rent_amount * v_active_days / v_days_in_month, 2);
      v_desc := 'Rent — ' || to_char(v_from, 'FMMon FMDD') || '–' || to_char(v_to, 'FMMon FMDD, YYYY')
                || ' (' || v_active_days || ' of ' || v_days_in_month || ' days)';
    end if;
  end if;
  if v_amount < 0 then
    raise exception 'The rent amount can''t be negative' using errcode = 'ZM322';
  end if;

  select string_agg(tn.name, ' & ' order by tn.name),
         string_agg(tn.email, ', ' order by tn.name) filter (where tn.email is not null)
    into v_names, v_emails
    from lease_tenants lt join tenants tn on tn.id = lt.tenant_id
   where lt.lease_id = l.id and lt.is_billing_recipient;

  perform set_config('app.invoice_op', 'on', true);
  insert into invoices (account_id, property_id, billed_to, period_start, period_end, amount_due, due_date,
                        lease_id, billing_entity_id, state, recipient_name, recipient_email, visible_note,
                        created_via, agent_run_id)
  values (l.account_id, l.property_id, v_names, p_period_start, v_period_end, v_amount,
          make_date(extract(year from p_period_start)::int, extract(month from p_period_start)::int, least(t.due_day, v_days_in_month)),
          l.id, p.billing_entity_id, 'draft', v_names, v_emails, nullif(trim(p_visible_note), ''),
          p_created_via, p_agent_run_id)
  returning * into inv;
  insert into invoice_lines (account_id, invoice_id, line_kind, description, amount, sort_order)
  values (inv.account_id, inv.id, v_kind, v_desc, v_amount, 0);
  perform invoice_log(inv, 'created', jsonb_build_object('via', p_created_via, 'active_days', v_active_days));
  perform set_config('app.invoice_op', 'off', true);
  return inv.id;
end $$;

-- Lock an invoice for an action and check the caller's version.
create or replace function invoice_lock_for_action(p_id uuid, p_expected_version integer, p_states text[])
returns invoices language plpgsql set search_path = public as $$
declare inv invoices;
begin
  select * into inv from invoices where id = p_id for update;
  if not found then
    raise exception 'Invoice not found' using errcode = 'ZM323';
  end if;
  if inv.version <> p_expected_version then
    raise exception 'This invoice changed since you opened it (now version %). Reload and review before continuing.', inv.version
      using errcode = 'ZM324';
  end if;
  if not (inv.state = any (p_states)) then
    raise exception 'This action isn''t available for an invoice that is %', inv.state using errcode = 'ZM325';
  end if;
  return inv;
end $$;

-- Edit a draft or approved invoice. p_patch keys: due_date, billing_entity_id,
-- recipient_name, recipient_email, visible_note, internal_note, lines
-- ([{line_kind, description, amount}]). Anything but internal_note is
-- material and clears an approval.
create or replace function update_invoice_draft(p_id uuid, p_expected_version integer, p_patch jsonb)
returns integer language plpgsql set search_path = public as $$
declare
  inv invoices; nxt invoices;
  v_unknown text[];
  v_changed text[] := '{}';
  v_old_lines jsonb; v_new_lines jsonb;
  v_material boolean;
begin
  inv := invoice_lock_for_action(p_id, p_expected_version, array['draft', 'approved']);
  select array_agg(k) into v_unknown from jsonb_object_keys(p_patch) k
   where k not in ('due_date', 'billing_entity_id', 'recipient_name', 'recipient_email', 'visible_note', 'internal_note', 'lines');
  if v_unknown is not null then
    raise exception 'Unknown invoice fields: %', array_to_string(v_unknown, ', ') using errcode = 'ZM326';
  end if;
  nxt := inv;
  if p_patch ? 'due_date' then
    if p_patch->>'due_date' is null then
      raise exception 'An invoice needs a due date' using errcode = 'ZM327';
    end if;
    nxt.due_date := (p_patch->>'due_date')::date;
  end if;
  if p_patch ? 'billing_entity_id' then
    nxt.billing_entity_id := (p_patch->>'billing_entity_id')::uuid;
    if inv.revision_of is not null and nxt.billing_entity_id is distinct from inv.billing_entity_id then
      raise exception 'A revision keeps its original issuer' using errcode = 'ZM328';
    end if;
    if nxt.billing_entity_id is not null
       and not exists (select 1 from llcs where id = nxt.billing_entity_id and account_id = inv.account_id) then
      raise exception 'The issuer must belong to the same account' using errcode = 'ZM300';
    end if;
  end if;
  if p_patch ? 'recipient_name' then nxt.recipient_name := nullif(trim(p_patch->>'recipient_name'), ''); nxt.billed_to := nxt.recipient_name; end if;
  if p_patch ? 'recipient_email' then nxt.recipient_email := nullif(trim(p_patch->>'recipient_email'), ''); end if;
  if p_patch ? 'visible_note' then nxt.visible_note := nullif(trim(p_patch->>'visible_note'), ''); end if;
  if p_patch ? 'internal_note' then nxt.internal_note := nullif(trim(p_patch->>'internal_note'), ''); end if;

  if nxt.due_date is distinct from inv.due_date then v_changed := array_append(v_changed, 'due date'); end if;
  if nxt.billing_entity_id is distinct from inv.billing_entity_id then v_changed := array_append(v_changed, 'issuer'); end if;
  if nxt.recipient_name is distinct from inv.recipient_name then v_changed := array_append(v_changed, 'recipient'); end if;
  if nxt.recipient_email is distinct from inv.recipient_email then v_changed := array_append(v_changed, 'recipient email'); end if;
  if nxt.visible_note is distinct from inv.visible_note then v_changed := array_append(v_changed, 'note shown on the invoice'); end if;

  if p_patch ? 'lines' then
    select coalesce(jsonb_agg(jsonb_build_object('line_kind', line_kind, 'description', description, 'amount', amount) order by sort_order, created_at), '[]')
      into v_old_lines from invoice_lines where invoice_id = inv.id;
    select coalesce(jsonb_agg(jsonb_build_object('line_kind', e->>'line_kind', 'description', trim(e->>'description'),
                                                  'amount', round((e->>'amount')::numeric, 2)) order by o), '[]')
      into v_new_lines from jsonb_array_elements(p_patch->'lines') with ordinality as x(e, o);
    if v_new_lines <> v_old_lines then
      if jsonb_array_length(v_new_lines) = 0 then
        raise exception 'An invoice needs at least one line' using errcode = 'ZM329';
      end if;
      v_changed := array_append(v_changed, 'lines');
    end if;
  end if;

  v_material := cardinality(v_changed) > 0;
  if not v_material and nxt.internal_note is not distinct from inv.internal_note then
    return inv.version;  -- nothing changed
  end if;

  perform set_config('app.invoice_op', 'on', true);
  if 'lines' = any (v_changed) then
    delete from invoice_lines where invoice_id = inv.id;
    insert into invoice_lines (account_id, invoice_id, line_kind, description, amount, sort_order)
    select inv.account_id, inv.id, e->>'line_kind', e->>'description', (e->>'amount')::numeric, (o - 1)::int
      from jsonb_array_elements(v_new_lines) with ordinality as x(e, o);
    select sum(amount) into nxt.amount_due from invoice_lines where invoice_id = inv.id;
    if nxt.amount_due < 0 then
      raise exception 'Credits can''t exceed the charges' using errcode = 'ZM330';
    end if;
  end if;

  update invoices set
    due_date = nxt.due_date, billing_entity_id = nxt.billing_entity_id,
    recipient_name = nxt.recipient_name, billed_to = nxt.billed_to, recipient_email = nxt.recipient_email,
    visible_note = nxt.visible_note, internal_note = nxt.internal_note, amount_due = nxt.amount_due,
    version = inv.version + 1,
    material_version = inv.material_version + case when v_material then 1 else 0 end,
    state = case when v_material and inv.state = 'approved' then 'draft' else inv.state end,
    approved_material_version = case when v_material then null else inv.approved_material_version end,
    approved_by = case when v_material then null else inv.approved_by end,
    approved_at = case when v_material then null else inv.approved_at end
  where id = inv.id returning * into nxt;

  perform invoice_log(nxt, 'edited', jsonb_build_object('changed', to_jsonb(v_changed), 'internal_note_changed',
                      nxt.internal_note is distinct from inv.internal_note, 'material', v_material));
  if v_material and inv.state = 'approved' then
    perform invoice_log(nxt, 'approval_cleared', jsonb_build_object('changed', to_jsonb(v_changed)));
  end if;
  perform set_config('app.invoice_op', 'off', true);
  return nxt.version;
end $$;

create or replace function approve_invoice(p_id uuid, p_expected_version integer)
returns integer language plpgsql set search_path = public as $$
declare inv invoices;
begin
  inv := invoice_lock_for_action(p_id, p_expected_version, array['draft']);
  perform set_config('app.invoice_op', 'on', true);
  update invoices set state = 'approved', approved_material_version = material_version,
         approved_by = auth.uid(), approved_at = now(), version = version + 1
   where id = p_id returning * into inv;
  perform invoice_log(inv, 'approved', jsonb_build_object('material_version', inv.material_version));
  perform set_config('app.invoice_op', 'off', true);
  return inv.version;
end $$;

create or replace function reject_invoice(p_id uuid, p_expected_version integer, p_reason text default null)
returns integer language plpgsql set search_path = public as $$
declare inv invoices;
begin
  inv := invoice_lock_for_action(p_id, p_expected_version, array['draft', 'approved']);
  perform set_config('app.invoice_op', 'on', true);
  update invoices set state = 'rejected', version = version + 1 where id = p_id returning * into inv;
  perform invoice_log(inv, 'rejected', jsonb_build_object('reason', nullif(trim(p_reason), '')));
  perform set_config('app.invoice_op', 'off', true);
  return inv.version;
end $$;

