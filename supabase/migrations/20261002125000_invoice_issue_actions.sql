-- T4 Stage 1 — invoice actions, part 2: issuance, revision, cancellation and
-- the entity sequence start. Same rules as part 1 (20261002120000): the
-- only write path, security invoker (RLS applies), version-checked through
-- invoice_lock_for_action, write flag opened and closed per transaction.

-- Explicit, owner-approved issuance. Refused unless what would print NOW is
-- exactly what was approved (issuer, branding, payment instructions,
-- recipients, rental, lines, dates, note, earlier-unpaid references). The
-- number comes from the issuing entity's invoice sequence, whose row is
-- locked for the allocation — every path waits its turn; the unique index is
-- the backstop. The approved snapshot is frozen as the issued document.
create or replace function issue_invoice(p_id uuid, p_expected_version integer)
returns text language plpgsql set search_path = public as $$
declare
  inv invoices; orig invoices; e llcs;
  v_seq bigint; v_number text; v_now jsonb; v_changed text[];
begin
  inv := invoice_lock_for_action(p_id, p_expected_version, array['approved']);
  if inv.approved_material_version is distinct from inv.material_version or inv.approved_snapshot is null then
    raise exception 'The approval no longer matches this invoice; approve it again' using errcode = 'ZM331';
  end if;
  v_now := invoice_print_snapshot(inv.id);
  if v_now is distinct from inv.approved_snapshot then
    select array_agg(k order by k) into v_changed from jsonb_object_keys(v_now) k
     where v_now -> k is distinct from inv.approved_snapshot -> k;
    raise exception 'Something printed on this invoice changed since you approved it (%). Review it and approve again.',
      array_to_string(v_changed, ', ') using errcode = 'ZM348', detail = array_to_string(v_changed, ',');
  end if;
  select * into e from llcs where id = inv.billing_entity_id;
  if e.id is null then
    raise exception 'Choose the issuing entity first' using errcode = 'ZM332';
  end if;
  if e.invoice_code is null then
    raise exception '% has no invoice code yet (Entity profile → Invoicing)', coalesce(e.display_name, e.name) using errcode = 'ZM333';
  end if;
  if not exists (select 1 from invoice_lines where invoice_id = inv.id) then
    raise exception 'An invoice needs at least one line' using errcode = 'ZM329';
  end if;

  perform set_config('app.invoice_op', 'on', true);
  if inv.revision_of is not null then
    select * into orig from invoices where id = inv.revision_of for update;
    if orig.state <> 'issued' or orig.number is null then
      raise exception 'Only the current issued version can be revised' using errcode = 'ZM334';
    end if;
    v_number := regexp_replace(orig.number, '-R[0-9]+$', '') || '-R' || inv.revision;
  else
    insert into document_sequences (account_id, entity_id, doc_type) values (inv.account_id, e.id, 'invoice')
      on conflict (entity_id, doc_type) do nothing;
    select next_value into v_seq from document_sequences where entity_id = e.id and doc_type = 'invoice' for update;
    v_number := format_document_number(e.invoice_code, 'invoice', v_seq);
    update document_sequences set next_value = v_seq + 1, first_issued_at = coalesce(first_issued_at, now())
     where entity_id = e.id and doc_type = 'invoice';
  end if;

  update invoices set
    state = 'issued', number = v_number, issued_by = auth.uid(), issued_at = now(), version = version + 1,
    issued_snapshot = inv.approved_snapshot || jsonb_build_object('number', v_number, 'issued_at', now())
  where id = inv.id returning * into inv;
  perform invoice_log(inv, 'issued', jsonb_build_object('number', v_number));
  if orig.id is not null then
    update invoices set state = 'superseded', version = version + 1 where id = orig.id returning * into orig;
    -- Billing-rule items now belong to the live revision.
    update tenancy_charge_statements set billed_invoice_id = inv.id where billed_invoice_id = orig.id;
    update tenancy_charge_rules set applied_invoice_id = inv.id where applied_invoice_id = orig.id;
    perform invoice_log(orig, 'superseded', jsonb_build_object('by', v_number));
  end if;
  perform set_config('app.invoice_op', 'off', true);
  return v_number;
end $$;

-- Explicit revision of an issued invoice: a linked draft copy. The original
-- (and its PDF) stays issued until the revision is issued. Refused while
-- payments are recorded against it: moving or re-allocating payments to a
-- revision isn't part of this release.
create or replace function revise_invoice(p_id uuid, p_expected_version integer)
returns uuid language plpgsql set search_path = public as $$
declare inv invoices; rev invoices;
begin
  inv := invoice_lock_for_action(p_id, p_expected_version, array['issued']);
  if inv.number is null then
    raise exception 'Legacy unnumbered invoices can''t be revised here' using errcode = 'ZM335';
  end if;
  if exists (select 1 from payments where invoice_id = inv.id) then
    raise exception 'Payments are recorded against %. A revision would need those payments moved to it, which this release doesn''t do — so this invoice can''t be revised. Its PDF and payments stay as they are.', inv.number
      using errcode = 'ZM349';
  end if;
  if exists (select 1 from invoices where revision_of = inv.id and state not in ('rejected')) then
    raise exception 'A revision of this invoice already exists' using errcode = 'ZM336';
  end if;
  perform set_config('app.invoice_op', 'on', true);
  insert into invoices (account_id, property_id, billed_to, period_start, period_end, amount_due, due_date,
                        lease_id, billing_entity_id, state, revision, revision_of, recipient_name, recipients,
                        visible_note, internal_note, created_via)
  values (inv.account_id, inv.property_id, inv.billed_to, inv.period_start, inv.period_end, inv.amount_due, inv.due_date,
          inv.lease_id, inv.billing_entity_id, 'draft', inv.revision + 1, inv.id, inv.recipient_name, inv.recipients,
          inv.visible_note, inv.internal_note, 'owner')
  returning * into rev;
  insert into invoice_lines (account_id, invoice_id, line_kind, description, amount, sort_order, rule_id, statement_id)
  select account_id, rev.id, line_kind, description, amount, sort_order, rule_id, statement_id from invoice_lines where invoice_id = inv.id;
  perform invoice_log(rev, 'created', jsonb_build_object('revision_of', inv.number));
  perform invoice_log(inv, 'revised', jsonb_build_object('revision_id', rev.id));
  perform set_config('app.invoice_op', 'off', true);
  return rev.id;
end $$;

-- Cancel an issued invoice: the number and PDF are kept; the sequence is
-- never rewound. Refused while payments are recorded against it or while a
-- revision is in progress. Its statement and one-time charges bill on the
-- next invoice instead.
create or replace function cancel_invoice(p_id uuid, p_expected_version integer, p_reason text)
returns integer language plpgsql set search_path = public as $$
declare inv invoices;
begin
  inv := invoice_lock_for_action(p_id, p_expected_version, array['issued']);
  if nullif(trim(p_reason), '') is null then
    raise exception 'Give a reason for cancelling' using errcode = 'ZM337';
  end if;
  if exists (select 1 from payments where invoice_id = inv.id) then
    raise exception 'Payments are recorded against this invoice; it can''t be cancelled here' using errcode = 'ZM338';
  end if;
  if exists (select 1 from invoices where revision_of = inv.id and state in ('draft', 'approved')) then
    raise exception 'Finish or reject the revision in progress first' using errcode = 'ZM336';
  end if;
  perform set_config('app.invoice_op', 'on', true);
  update invoices set state = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now(),
         cancel_reason = trim(p_reason), version = version + 1
   where id = inv.id returning * into inv;
  perform release_rule_billing(inv.id);
  perform invoice_log(inv, 'cancelled', jsonb_build_object('reason', inv.cancel_reason));
  perform set_config('app.invoice_op', 'off', true);
  return inv.version;
end $$;

-- Business setting: the first number an entity's sequence will use (to
-- continue existing paper numbering). Only before that sequence has issued
-- anything, so numbers are never reused or skipped backwards.
create or replace function set_document_sequence_start(p_entity_id uuid, p_doc_type text, p_next_value bigint)
returns void language plpgsql set search_path = public as $$
declare e llcs;
begin
  select * into e from llcs where id = p_entity_id;
  if e.id is null then raise exception 'Entity not found' using errcode = 'ZM323'; end if;
  perform invoice_require_owner(e.account_id);
  if p_next_value < 1 then raise exception 'Numbers start at 1 or higher' using errcode = 'ZM339'; end if;
  if p_doc_type not in ('invoice', 'receipt') then
    raise exception 'Unknown document type' using errcode = 'ZM339';
  end if;
  if exists (select 1 from document_sequences where entity_id = e.id and doc_type = p_doc_type and first_issued_at is not null)
     or (p_doc_type = 'invoice' and exists (select 1 from invoices where billing_entity_id = e.id and number is not null and revision_of is null)) then
    raise exception 'Numbering has already started for this entity; the sequence can''t be changed' using errcode = 'ZM339';
  end if;
  perform set_config('app.invoice_op', 'on', true);
  insert into document_sequences (account_id, entity_id, doc_type, next_value) values (e.account_id, e.id, p_doc_type, p_next_value)
    on conflict (entity_id, doc_type) do update set next_value = excluded.next_value;
  perform set_config('app.invoice_op', 'off', true);
end $$;
