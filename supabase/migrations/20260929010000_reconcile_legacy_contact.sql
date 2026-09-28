-- Package 1 release-readiness corrections (defect #1) — the "Review
-- saved contact details" reconciliation previously ran as several
-- separate client-side calls (create/find contact, find-or-create link,
-- find-or-create each method, mark reconciled), each with its own error
-- silently ignored in places, and no single-key concurrency guard beyond
-- a sequential "check then insert" that two simultaneous confirmations
-- with the same intent could both pass before either had inserted.
--
-- This mirrors create_property_with_ownership's reserve-or-fetch pattern
-- (20260928020000), but goes further: because reconciliation is pure DB
-- writes (no Storage call in the middle), the ENTIRE operation — resolve
-- contact, resolve link, resolve each method, mark the property
-- reconciled, mark the request complete — runs inside this one
-- plpgsql function, i.e. one Postgres transaction. Any failure partway
-- (a bad constraint, an authorization check, anything) rolls back
-- everything in this call, including the reservation row itself, so a
-- retry after a genuine partial failure starts completely clean rather
-- than needing its own per-step resumability. A retry after the
-- transaction actually committed but the client never saw the response
-- (a lost response) instead hits the fast path below and returns the
-- same contact_id without redoing any work.
create table legacy_contact_reconciliation_requests (
  idempotency_key uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  payload_hash text not null,
  contact_id uuid references contacts(id),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table legacy_contact_reconciliation_requests enable row level security;
create policy "members can see their own account's reconciliation requests"
  on legacy_contact_reconciliation_requests for select using (is_account_member(account_id));
-- No client-facing insert/update policy — same reasoning as
-- property_creation_requests: only the security-definer function below
-- writes this table.

create or replace function reconcile_legacy_contact(
  p_account_id uuid,
  p_property_id uuid,
  p_idempotency_key uuid,
  p_mode text,
  p_existing_contact_id uuid,
  p_new_contact_name text,
  p_role text,
  p_phone text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload_hash text := encode(extensions.digest(
    coalesce(p_mode, '') || '|' || coalesce(p_existing_contact_id::text, '') || '|' ||
    coalesce(btrim(p_new_contact_name), '') || '|' || coalesce(btrim(p_role), '') || '|' ||
    coalesce(p_phone, '') || '|' || coalesce(p_email, ''), 'sha256'), 'hex');
  v_request record;
  v_contact_id uuid;
  v_existing_link_id uuid;
begin
  if not is_account_member(p_account_id) then
    raise exception 'Not authorized for this account.' using errcode = 'ZM002';
  end if;
  if not exists (select 1 from properties where id = p_property_id and account_id = p_account_id) then
    raise exception 'Property not found for this account.' using errcode = 'ZM002';
  end if;
  if p_mode not in ('existing', 'new') then
    raise exception 'Invalid reconciliation mode.' using errcode = 'ZM003';
  end if;
  if p_mode = 'existing' and p_existing_contact_id is null then
    raise exception 'Select an existing contact.' using errcode = 'ZM003';
  end if;
  if p_mode = 'new' and coalesce(btrim(p_new_contact_name), '') = '' then
    raise exception 'Enter a name for the new contact.' using errcode = 'ZM003';
  end if;

  -- Reserve-or-fetch: two calls carrying the same idempotency_key
  -- serialize on this row's lock. The first to arrive creates the row
  -- and does the real work below; the second blocks here until the
  -- first commits, then sees completed_at already set and returns the
  -- same contact_id immediately (fast path below) without touching
  -- contacts/contact_links/contact_methods a second time. This is what
  -- makes "two simultaneous confirmations" safe, not the existence
  -- checks further down (those exist for correctness across genuinely
  -- separate attempts — e.g. reopening the modal — not for concurrency).
  insert into legacy_contact_reconciliation_requests
    (idempotency_key, account_id, property_id, payload_hash, contact_id, completed_at, created_at)
  values (p_idempotency_key, p_account_id, p_property_id, v_payload_hash, null, null, now())
  on conflict (idempotency_key) do update
    set idempotency_key = legacy_contact_reconciliation_requests.idempotency_key
  returning * into v_request;

  if v_request.account_id <> p_account_id or v_request.property_id <> p_property_id then
    raise exception 'Not authorized for this account.' using errcode = 'ZM002';
  end if;

  if v_request.payload_hash <> v_payload_hash then
    raise exception 'This reconciliation was already started with different data. Reopen the review to start again.' using errcode = 'ZM005';
  end if;

  if v_request.completed_at is not null then
    return v_request.contact_id;
  end if;

  if p_mode = 'existing' then
    if not exists (select 1 from contacts where id = p_existing_contact_id and account_id = p_account_id) then
      raise exception 'Selected contact is not part of this account.' using errcode = 'ZM002';
    end if;
    v_contact_id := p_existing_contact_id;
  else
    insert into contacts (account_id, name, notes)
    values (p_account_id, btrim(p_new_contact_name), null)
    returning id into v_contact_id;
  end if;

  -- Preserve an already-existing link's own role/label rather than
  -- overwriting it — only created when genuinely absent.
  select id into v_existing_link_id from contact_links
    where account_id = p_account_id and contact_id = v_contact_id and property_id = p_property_id;
  if v_existing_link_id is null then
    insert into contact_links (account_id, contact_id, property_id, role)
    values (p_account_id, v_contact_id, p_property_id, nullif(btrim(coalesce(p_role, '')), ''));
  end if;

  if coalesce(btrim(p_phone), '') <> '' and not exists (
    select 1 from contact_methods
    where account_id = p_account_id and contact_id = v_contact_id and method_type = 'phone' and value = p_phone
  ) then
    insert into contact_methods (account_id, contact_id, method_type, value, label, is_preferred)
    values (p_account_id, v_contact_id, 'phone', p_phone, 'From property record', false);
  end if;

  if coalesce(btrim(p_email), '') <> '' and not exists (
    select 1 from contact_methods
    where account_id = p_account_id and contact_id = v_contact_id and method_type = 'email' and value = p_email
  ) then
    insert into contact_methods (account_id, contact_id, method_type, value, label, is_preferred)
    values (p_account_id, v_contact_id, 'email', p_email, 'From property record', false);
  end if;

  -- coalesce, not overwrite: a retry (same or a later separate attempt)
  -- never moves the original confirmation timestamp forward.
  update properties set legacy_contact_reconciled_at = coalesce(legacy_contact_reconciled_at, now()) where id = p_property_id;

  update legacy_contact_reconciliation_requests
    set contact_id = v_contact_id, completed_at = now()
    where idempotency_key = p_idempotency_key;

  return v_contact_id;
end;
$$;

revoke all on function reconcile_legacy_contact(uuid, uuid, uuid, text, uuid, text, text, text, text) from public;
grant execute on function reconcile_legacy_contact(uuid, uuid, uuid, text, uuid, text, text, text, text) to authenticated;
