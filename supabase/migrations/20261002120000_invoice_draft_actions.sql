-- T4 Stage 1 — invoice actions, part 1: drafting, the print snapshot,
-- editing and approval. Part 2 (issue, revise, cancel, sequence start) is
-- 20261002125000. These are the ONLY write paths for invoices, their lines,
-- events and number sequences (see invoices_guard). Security invoker: RLS
-- applies to the caller, so every read/write is account-scoped. Each
-- function opens the write flag for its own transaction and closes it.
--
-- Trusted provenance: drafting lives in invoicing_internal, a schema the API
-- does not expose. The public create_invoice_draft is always the owner's;
-- only run_assistant_invoice_drafts (20261002130000) can mark a draft as the
-- assistant's and attach its run.

create schema if not exists invoicing_internal;
grant usage on schema invoicing_internal to authenticated;

create or replace function invoicing_internal.create_draft_core(
  p_lease_id uuid,
  p_period_start date,
  p_created_via text,
  p_agent_run_id uuid,
  p_visible_note text,
  p_manual_amount numeric
) returns uuid language plpgsql set search_path = public as $$
declare
  l leases; t lease_billing_terms; p properties; inv invoices; r record;
  v_blockers text[];
  v_period_end date := (p_period_start + interval '1 month' - interval '1 day')::date;
  v_days_in_month int := extract(day from v_period_end)::int;
  v_from date; v_to date; v_active_days int;
  v_kind text := 'rent'; v_amount numeric(10, 2); v_desc text;
  v_recipients jsonb; v_names text; v_sort int := 0;
begin
  -- Only a tenancy the caller can see; then only if they own the portfolio.
  select * into l from leases where id = p_lease_id;
  if l.id is not null then perform invoice_require_owner(l.account_id); end if;
  v_blockers := get_invoice_draft_blockers(p_lease_id, p_period_start);
  if p_manual_amount is not null then
    v_blockers := array_remove(v_blockers, 'prorate_manual');
  end if;
  if cardinality(v_blockers) > 0 then
    raise exception 'This tenancy can''t be drafted yet: %', array_to_string(v_blockers, ', ')
      using errcode = 'ZM320', detail = array_to_string(v_blockers, ',');
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

  select coalesce(jsonb_agg(jsonb_build_object('tenant_id', tn.id, 'name', tn.name, 'email', tn.email, 'phone', tn.phone) order by tn.name), '[]'),
         string_agg(tn.name, ' & ' order by tn.name)
    into v_recipients, v_names
    from lease_tenants lt join tenants tn on tn.id = lt.tenant_id
   where lt.lease_id = l.id and lt.is_billing_recipient;

  perform set_config('app.invoice_op', 'on', true);
  insert into invoices (account_id, property_id, billed_to, period_start, period_end, amount_due, due_date,
                        lease_id, billing_entity_id, state, recipient_name, recipients, visible_note,
                        created_via, agent_run_id)
  values (l.account_id, l.property_id, v_names, p_period_start, v_period_end, v_amount,
          make_date(extract(year from p_period_start)::int, extract(month from p_period_start)::int, least(t.due_day, v_days_in_month)),
          l.id, p.billing_entity_id, 'draft', v_names, v_recipients, nullif(trim(p_visible_note), ''),
          p_created_via, p_agent_run_id)
  returning * into inv;
  insert into invoice_lines (account_id, invoice_id, line_kind, description, amount, sort_order)
  values (inv.account_id, inv.id, v_kind, v_desc, v_amount, v_sort);

  -- Billing rules for this period (tenancy_charge_rules).
  for r in
    select * from tenancy_charge_rules
     where lease_id = l.id and status = 'active' and kind = 'fixed_recurring'
       and coalesce(effective_from, p_period_start) <= v_period_end
       and coalesce(effective_to, p_period_start) >= p_period_start
     order by created_at
  loop
    v_sort := v_sort + 1;
    insert into invoice_lines (account_id, invoice_id, line_kind, description, amount, sort_order, rule_id)
    values (inv.account_id, inv.id, 'charge',
            r.description || case when r.basis_total is not null and r.share_percent is not null
                                  then ' (' || trim(to_char(r.share_percent, 'FM990.##')) || '% of ' || to_char(r.basis_total, 'FM$999,990.00') || ')' else '' end,
            r.amount, v_sort, r.id);
  end loop;
  for r in
    select s.*, cr.description, cr.share_percent
      from tenancy_charge_statements s join tenancy_charge_rules cr on cr.id = s.rule_id
     where cr.lease_id = l.id and cr.status = 'active' and s.billed_invoice_id is null
       and s.service_period_start <= p_period_start
     order by s.service_period_start, cr.created_at
  loop
    v_sort := v_sort + 1;
    insert into invoice_lines (account_id, invoice_id, line_kind, description, amount, sort_order, rule_id, statement_id)
    values (inv.account_id, inv.id, 'charge',
            r.description || ' — ' || trim(to_char(r.share_percent, 'FM990.##')) || '% of ' || to_char(r.service_period_start, 'FMMonth YYYY')
              || ' statement (' || to_char(r.statement_amount, 'FM$999,990.00') || ')',
            round(r.statement_amount * r.share_percent / 100, 2), v_sort, r.rule_id, r.id);
    update tenancy_charge_statements set billed_invoice_id = inv.id where id = r.id;
  end loop;
  for r in
    select * from tenancy_charge_rules
     where lease_id = l.id and status = 'active' and kind = 'one_time'
       and one_time_period = p_period_start and applied_invoice_id is null
     order by created_at
  loop
    v_sort := v_sort + 1;
    insert into invoice_lines (account_id, invoice_id, line_kind, description, amount, sort_order, rule_id)
    values (inv.account_id, inv.id, case when r.amount < 0 then 'credit' else 'charge' end, r.description, r.amount, v_sort, r.id);
    update tenancy_charge_rules set applied_invoice_id = inv.id where id = r.id;
  end loop;

  update invoices set amount_due = (select sum(amount) from invoice_lines where invoice_id = inv.id) where id = inv.id returning * into inv;
  if inv.amount_due < 0 then
    raise exception 'Credits for this period exceed the charges' using errcode = 'ZM330';
  end if;
  perform invoice_log(inv, 'created', jsonb_build_object('via', p_created_via, 'active_days', v_active_days));
  perform set_config('app.invoice_op', 'off', true);
  return inv.id;
end $$;

revoke all on function invoicing_internal.create_draft_core(uuid, date, text, uuid, text, numeric) from public, anon;
grant execute on function invoicing_internal.create_draft_core(uuid, date, text, uuid, text, numeric) to authenticated;

-- The owner's drafting path (Rent ops). Always created_via = 'owner'.
create or replace function create_invoice_draft(p_lease_id uuid, p_period_start date, p_manual_amount numeric default null)
returns uuid language sql set search_path = public as $$
  select invoicing_internal.create_draft_core(p_lease_id, p_period_start, 'owner', null, null, p_manual_amount)
$$;

-- Variable (statement-based) charges that are still unresolved for a month:
-- active rules with no entered statement for the month before it. Shown to
-- the owner; never estimated.
create or replace function unresolved_variable_charges(p_lease_id uuid, p_period_start date)
returns table (rule_id uuid, description text, service_period_start date) language sql stable set search_path = public as $$
  select r.id, r.description, (p_period_start - interval '1 month')::date
  from tenancy_charge_rules r
  where r.lease_id = p_lease_id and r.status = 'active' and r.kind = 'variable_statement'
    and coalesce(r.effective_from, p_period_start) <= p_period_start
    and not exists (select 1 from tenancy_charge_statements s
                    where s.rule_id = r.id and s.service_period_start = (p_period_start - interval '1 month')::date)
$$;

-- Everything the invoice would print, from the records as they are NOW:
-- issuer identity, branding (incl. logo version), effective payment
-- instructions (property override, else entity default), recipients,
-- rental, lines, dates, note and earlier unpaid invoices (references only).
-- Approval records this; issue refuses if it has changed since.
create or replace function invoice_print_snapshot(p_id uuid) returns jsonb language plpgsql stable set search_path = public as $$
declare inv invoices; e llcs; b entity_document_branding; lv entity_logo_versions; pr properties; u units; l leases; v_orig text;
begin
  select * into inv from invoices where id = p_id;
  if inv.id is null then return null; end if;
  select * into e from llcs where id = inv.billing_entity_id;
  select * into b from entity_document_branding where entity_id = inv.billing_entity_id;
  select * into lv from entity_logo_versions where id = b.current_logo_id;
  select * into pr from properties where id = inv.property_id;
  select * into l from leases where id = inv.lease_id;
  select * into u from units where id = l.unit_id;
  select number into v_orig from invoices where id = inv.revision_of;
  return jsonb_build_object(
    'issuer', case when e.id is null then null else jsonb_build_object(
      'entity_id', e.id, 'legal_name', e.name, 'display_name', e.display_name, 'invoice_code', e.invoice_code,
      'mailing_address', e.mailing_address, 'mailing_city', e.mailing_city, 'mailing_state', e.mailing_state, 'mailing_zip', e.mailing_zip) end,
    'branding', jsonb_build_object(
      'heading_color', b.heading_color, 'accent_color', b.accent_color, 'highlight_color', b.highlight_color, 'secondary_color', b.secondary_color,
      'reply_to_email', b.reply_to_email, 'document_phone', b.document_phone, 'website', b.website,
      'paper_size', coalesce(b.paper_size, 'letter'), 'show_legal_name', coalesce(b.show_legal_name, true), 'document_footer', b.document_footer,
      'logo', case when lv.id is null then null else jsonb_build_object('id', lv.id, 'storage_path', lv.storage_path, 'sha256', lv.sha256,
                                                                        'format', lv.format, 'width', lv.width, 'height', lv.height) end),
    'payment_instructions', jsonb_build_object(
      'text', coalesce(nullif(trim(pr.payment_instructions_override), ''), nullif(trim(b.payment_instructions), '')),
      'source', case when nullif(trim(pr.payment_instructions_override), '') is not null then 'property'
                     when nullif(trim(b.payment_instructions), '') is not null then 'entity' end),
    'recipients', inv.recipients,
    'rental', jsonb_build_object('property_address', pr.address, 'unit_label', u.unit_label),
    'period_start', inv.period_start, 'period_end', inv.period_end, 'due_date', inv.due_date,
    'lines', (select coalesce(jsonb_agg(jsonb_build_object('kind', line_kind, 'description', description, 'amount', amount) order by sort_order, created_at), '[]')
              from invoice_lines where invoice_id = inv.id),
    'amount_due', inv.amount_due,
    'note', coalesce(inv.visible_note, nullif(trim(b.default_invoice_note), '')),
    'revision', inv.revision, 'revision_of_number', v_orig,
    'prior_unpaid', (
      select coalesce(jsonb_agg(jsonb_build_object('number', o.number, 'period_start', o.period_start, 'outstanding', o.amount_due - coalesce(pd.paid, 0)) order by o.period_start), '[]')
      from invoices o
      left join lateral (select sum(amount) as paid from payments where invoice_id = o.id) pd on true
      where o.lease_id = inv.lease_id and o.state = 'issued' and o.number is not null and o.id <> inv.id
        and o.id is distinct from inv.revision_of and o.period_start < inv.period_start
        and o.amount_due - coalesce(pd.paid, 0) > 0)
  );
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
  perform invoice_require_owner(inv.account_id);
  if inv.version <> p_expected_version then
    raise exception 'This invoice changed since you opened it (now version %). Reload and review before continuing.', inv.version
      using errcode = 'ZM324';
  end if;
  if not (inv.state = any (p_states)) then
    raise exception 'This action isn''t available for an invoice that is %', inv.state using errcode = 'ZM325';
  end if;
  return inv;
end $$;

-- Edit a draft or approved invoice. p_patch keys: due_date,
-- billing_entity_id, visible_note, internal_note, lines (manual lines only —
-- billing-rule lines stay), refresh_recipients (true = re-read the billed
-- people from their tenant profiles). Anything but internal_note is
-- material and clears an approval.
create or replace function update_invoice_draft(p_id uuid, p_expected_version integer, p_patch jsonb)
returns integer language plpgsql set search_path = public as $$
declare
  inv invoices; nxt invoices;
  v_unknown text[];
  v_changed text[] := '{}';
  v_old_lines jsonb; v_new_lines jsonb;
  v_material boolean;
  v_recipients jsonb; v_names text;
begin
  inv := invoice_lock_for_action(p_id, p_expected_version, array['draft', 'approved']);
  select array_agg(k) into v_unknown from jsonb_object_keys(p_patch) k
   where k not in ('due_date', 'billing_entity_id', 'visible_note', 'internal_note', 'lines', 'refresh_recipients');
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
  if p_patch ? 'visible_note' then nxt.visible_note := nullif(trim(p_patch->>'visible_note'), ''); end if;
  if p_patch ? 'internal_note' then nxt.internal_note := nullif(trim(p_patch->>'internal_note'), ''); end if;
  if coalesce((p_patch->>'refresh_recipients')::boolean, false) then
    select coalesce(jsonb_agg(jsonb_build_object('tenant_id', tn.id, 'name', tn.name, 'email', tn.email, 'phone', tn.phone) order by tn.name), '[]'),
           string_agg(tn.name, ' & ' order by tn.name)
      into v_recipients, v_names
      from lease_tenants lt join tenants tn on tn.id = lt.tenant_id
     where lt.lease_id = inv.lease_id and lt.is_billing_recipient;
    nxt.recipients := v_recipients;
    nxt.recipient_name := v_names;
    nxt.billed_to := v_names;
  end if;

  if nxt.due_date is distinct from inv.due_date then v_changed := array_append(v_changed, 'due date'); end if;
  if nxt.billing_entity_id is distinct from inv.billing_entity_id then v_changed := array_append(v_changed, 'issuer'); end if;
  if nxt.recipients is distinct from inv.recipients then v_changed := array_append(v_changed, 'recipients'); end if;
  if nxt.visible_note is distinct from inv.visible_note then v_changed := array_append(v_changed, 'note shown on the invoice'); end if;

  if p_patch ? 'lines' then
    select coalesce(jsonb_agg(jsonb_build_object('line_kind', line_kind, 'description', description, 'amount', amount) order by sort_order, created_at), '[]')
      into v_old_lines from invoice_lines where invoice_id = inv.id and rule_id is null;
    select coalesce(jsonb_agg(jsonb_build_object('line_kind', e->>'line_kind', 'description', trim(e->>'description'),
                                                  'amount', round((e->>'amount')::numeric, 2)) order by o), '[]')
      into v_new_lines from jsonb_array_elements(p_patch->'lines') with ordinality as x(e, o);
    if v_new_lines <> v_old_lines then
      v_changed := array_append(v_changed, 'lines');
    end if;
  end if;

  v_material := cardinality(v_changed) > 0;
  if not v_material and nxt.internal_note is not distinct from inv.internal_note then
    return inv.version;  -- nothing changed
  end if;

  perform set_config('app.invoice_op', 'on', true);
  if 'lines' = any (v_changed) then
    delete from invoice_lines where invoice_id = inv.id and rule_id is null;
    insert into invoice_lines (account_id, invoice_id, line_kind, description, amount, sort_order)
    select inv.account_id, inv.id, e->>'line_kind', e->>'description', (e->>'amount')::numeric, (1000 + o)::int
      from jsonb_array_elements(v_new_lines) with ordinality as x(e, o);
    if not exists (select 1 from invoice_lines where invoice_id = inv.id) then
      raise exception 'An invoice needs at least one line' using errcode = 'ZM329';
    end if;
    select sum(amount) into nxt.amount_due from invoice_lines where invoice_id = inv.id;
    if nxt.amount_due < 0 then
      raise exception 'Credits can''t exceed the charges' using errcode = 'ZM330';
    end if;
  end if;

  update invoices set
    due_date = nxt.due_date, billing_entity_id = nxt.billing_entity_id,
    recipients = nxt.recipients, recipient_name = nxt.recipient_name, billed_to = nxt.billed_to,
    visible_note = nxt.visible_note, internal_note = nxt.internal_note, amount_due = nxt.amount_due,
    version = inv.version + 1,
    material_version = inv.material_version + case when v_material then 1 else 0 end,
    state = case when v_material and inv.state = 'approved' then 'draft' else inv.state end,
    approved_material_version = case when v_material then null else inv.approved_material_version end,
    approved_snapshot = case when v_material then null else inv.approved_snapshot end,
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

-- Approval records EXACTLY what would print right now. Approving an
-- already-approved invoice again refreshes that record (e.g. after the
-- entity's branding or payment instructions changed).
create or replace function approve_invoice(p_id uuid, p_expected_version integer)
returns integer language plpgsql set search_path = public as $$
declare inv invoices;
begin
  inv := invoice_lock_for_action(p_id, p_expected_version, array['draft', 'approved']);
  perform set_config('app.invoice_op', 'on', true);
  update invoices set state = 'approved', approved_material_version = material_version,
         approved_snapshot = invoice_print_snapshot(p_id),
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
  update invoices set state = 'rejected', approved_snapshot = null, version = version + 1 where id = p_id returning * into inv;
  -- Statements and one-time charges on a rejected draft bill on the next one.
  if inv.revision_of is null then perform release_rule_billing(inv.id); end if;
  perform invoice_log(inv, 'rejected', jsonb_build_object('reason', nullif(trim(p_reason), '')));
  perform set_config('app.invoice_op', 'off', true);
  return inv.version;
end $$;
