-- T4 Stage 1 — invoice actions, part 2: issuance, revision, cancellation and
-- the entity sequence start. Same rules as part 1 (20261002120000): the
-- only write path, security invoker (RLS applies), version-checked through
-- invoice_lock_for_action, write flag opened and closed per transaction.

-- Explicit, owner-approved issuance. The number comes from the issuing
-- entity's invoice sequence, whose row is locked for the allocation — every
-- path (owner, assistant, revision) waits its turn; the unique index is the
-- backstop. Issuer and recipient details are snapshotted so later settings
-- changes never alter an issued document.
create or replace function issue_invoice(p_id uuid, p_expected_version integer)
returns text language plpgsql set search_path = public as $$
declare
  inv invoices; orig invoices; e llcs; l leases; pr properties; u units;
  v_seq bigint; v_number text;
begin
  inv := invoice_lock_for_action(p_id, p_expected_version, array['approved']);
  if inv.approved_material_version is distinct from inv.material_version then
    raise exception 'The approval no longer matches this invoice; approve it again' using errcode = 'ZM331';
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

  select * into l from leases where id = inv.lease_id;
  select * into pr from properties where id = inv.property_id;
  select * into u from units where id = l.unit_id;
  update invoices set
    state = 'issued', number = v_number, issued_by = auth.uid(), issued_at = now(), version = version + 1,
    issuer_snapshot = jsonb_build_object(
      'entity_id', e.id, 'legal_name', e.name, 'display_name', e.display_name, 'invoice_code', e.invoice_code,
      'mailing_address', e.mailing_address, 'mailing_city', e.mailing_city, 'mailing_state', e.mailing_state,
      'mailing_zip', e.mailing_zip, 'reply_to', e.billing_reply_to_email, 'payment_instructions', e.payment_instructions),
    recipient_snapshot = jsonb_build_object(
      'name', inv.recipient_name, 'email', inv.recipient_email,
      'property_address', pr.address, 'unit_label', u.unit_label)
  where id = inv.id returning * into inv;
  perform invoice_log(inv, 'issued', jsonb_build_object('number', v_number));
  if orig.id is not null then
    update invoices set state = 'superseded', version = version + 1 where id = orig.id returning * into orig;
    perform invoice_log(orig, 'superseded', jsonb_build_object('by', v_number));
  end if;
  perform set_config('app.invoice_op', 'off', true);
  return v_number;
end $$;

-- Explicit revision of an issued invoice: a linked draft copy. The original
-- (and its PDF) stays issued until the revision is issued.
create or replace function revise_invoice(p_id uuid, p_expected_version integer)
returns uuid language plpgsql set search_path = public as $$
declare inv invoices; rev invoices;
begin
  inv := invoice_lock_for_action(p_id, p_expected_version, array['issued']);
  if inv.number is null then
    raise exception 'Legacy unnumbered invoices can''t be revised here' using errcode = 'ZM335';
  end if;
  if exists (select 1 from invoices where revision_of = inv.id and state not in ('rejected')) then
    raise exception 'A revision of this invoice already exists' using errcode = 'ZM336';
  end if;
  perform set_config('app.invoice_op', 'on', true);
  insert into invoices (account_id, property_id, billed_to, period_start, period_end, amount_due, due_date,
                        lease_id, billing_entity_id, state, revision, revision_of, recipient_name, recipient_email,
                        visible_note, internal_note, created_via)
  values (inv.account_id, inv.property_id, inv.billed_to, inv.period_start, inv.period_end, inv.amount_due, inv.due_date,
          inv.lease_id, inv.billing_entity_id, 'draft', inv.revision + 1, inv.id, inv.recipient_name, inv.recipient_email,
          inv.visible_note, inv.internal_note, 'owner')
  returning * into rev;
  insert into invoice_lines (account_id, invoice_id, line_kind, description, amount, sort_order)
  select account_id, rev.id, line_kind, description, amount, sort_order from invoice_lines where invoice_id = inv.id;
  perform invoice_log(rev, 'created', jsonb_build_object('revision_of', inv.number));
  perform invoice_log(inv, 'revised', jsonb_build_object('revision_id', rev.id));
  perform set_config('app.invoice_op', 'off', true);
  return rev.id;
end $$;

-- Cancel an issued invoice: the number and PDF are kept; the sequence is
-- never rewound. Refused while payments are recorded against it (resolving
-- payments is outside Stage 1) or while a revision is in progress.
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
