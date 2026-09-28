-- Package 1 §5 (contract v3) — idempotent, account-scoped, atomic
-- property + ownership creation for the four-step creation wizard.
-- Corrects the v2 mechanism (documented in the contract as broken:
-- `insert ... on conflict do nothing returning` returns zero rows on an
-- actual conflict, so a retry could never find the property it was
-- retrying).
--
-- Also resolves inline "+ Add a new owner" entries: each ownership entry
-- carries EITHER an existing owner_id OR a new_owner_name (+ optional
-- owner_kind), never both. A new_owner_name entry creates its llcs row
-- inside this same function call — one Postgres transaction — so a
-- failure anywhere after it (including the ownership-interests write
-- below) rolls back the new owner too. There is no code path that
-- creates an llcs row without this function also completing the
-- property/ownership write in the same transaction, and no code path
-- that runs this logic without the caller having reached the wizard's
-- own Save step — nothing here fires from typing a name into the field.

create table property_creation_requests (
  idempotency_key uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  payload_hash text not null,
  property_id uuid references properties(id),
  created_at timestamptz not null default now()
);
alter table property_creation_requests enable row level security;
create policy "members can see their own account's requests"
  on property_creation_requests for select using (is_account_member(account_id));
-- No client-facing insert/update policy: only the security-definer
-- function below writes this table, same pattern as
-- property_ownership_interests itself.

create or replace function create_property_with_ownership(
  p_account_id uuid,
  p_idempotency_key uuid,
  p_property jsonb,
  p_ownership_entries jsonb,
  p_allocation_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  -- pgcrypto's digest() lives in the `extensions` schema on this
  -- project, not `public` — schema-qualified here rather than widening
  -- this security-definer function's own search_path to include it.
  v_payload_hash text := encode(extensions.digest(p_property::text || p_ownership_entries::text, 'sha256'), 'hex');
  v_request record;
  v_property_id uuid;
  v_resolved_entries jsonb := '[]'::jsonb;
  v_entry jsonb;
  v_owner_id uuid;
  v_new_owner_name text;
  v_owner_kind text;
begin
  if not is_account_member(p_account_id) then
    raise exception 'Not authorized for this account.' using errcode = 'ZM002';
  end if;

  -- Reserve-or-fetch in one statement: DO UPDATE with a no-op
  -- self-assignment forces RETURNING to yield the existing row on
  -- conflict, which plain DO NOTHING can never do. The
  -- property_creation_requests row's own primary key gives Postgres's
  -- row-level lock for free, so two concurrent calls with the same key
  -- serialize here — only one proceeds to actually create anything.
  insert into property_creation_requests (idempotency_key, account_id, payload_hash, property_id, created_at)
  values (p_idempotency_key, p_account_id, v_payload_hash, null, now())
  on conflict (idempotency_key) do update
    set idempotency_key = property_creation_requests.idempotency_key
  returning * into v_request;

  if v_request.account_id <> p_account_id then
    -- Either a UUID collision (astronomically unlikely) or a client bug
    -- / attempted probe. Refuse without disclosing anything about the
    -- other account's row.
    raise exception 'Not authorized for this account.' using errcode = 'ZM002';
  end if;

  if v_request.property_id is not null then
    if v_request.payload_hash <> v_payload_hash then
      raise exception 'This request was already completed with different data. Start a new property instead of resubmitting changed data under the same request.' using errcode = 'ZM005';
    end if;
    return v_request.property_id;
  end if;

  if v_request.payload_hash <> v_payload_hash then
    raise exception 'This request is already in progress with different data.' using errcode = 'ZM005';
  end if;

  -- First real attempt for this key. Resolve every ownership entry to a
  -- real owner_id first — creating any new owner's llcs row right here,
  -- in the same transaction as everything below.
  for v_entry in select * from jsonb_array_elements(coalesce(p_ownership_entries, '[]'::jsonb))
  loop
    v_owner_id := nullif(v_entry->>'owner_id', '')::uuid;
    v_new_owner_name := nullif(btrim(coalesce(v_entry->>'new_owner_name', '')), '');
    v_owner_kind := nullif(v_entry->>'owner_kind', '');

    if v_owner_id is not null and v_new_owner_name is not null then
      raise exception 'An ownership entry cannot both reference an existing owner and name a new one.' using errcode = 'ZM003';
    end if;
    if v_owner_id is null and v_new_owner_name is null then
      raise exception 'Each ownership entry needs either an existing owner or a new owner name.' using errcode = 'ZM003';
    end if;

    if v_owner_id is null then
      insert into llcs (account_id, name, owner_kind)
      values (p_account_id, v_new_owner_name, v_owner_kind)
      returning id into v_owner_id;
    else
      if not exists (select 1 from llcs where id = v_owner_id and account_id = p_account_id) then
        raise exception 'One or more owners are not part of this account.' using errcode = 'ZM002';
      end if;
    end if;

    v_resolved_entries := v_resolved_entries || jsonb_build_object(
      'owner_id', v_owner_id,
      'percentage', v_entry->'percentage',
      'effective_date', v_entry->'effective_date'
    );
  end loop;

  insert into properties (
    account_id, name, llc_id, address, city, state, zip,
    insurance_provider, insurance_policy_number, contact_email,
    purchase_price, status, purchase_date, property_type, purchase_method,
    property_tax_id, county, township, square_footage, lot_size,
    municipal_zoning_code, county_assessor_use_code, bedroom_count, bathroom_count,
    basement, garage_spaces, street_parking, parking_notes, lot_size_value,
    lot_size_unit, year_built, exterior_wall_materials, owner_name, contact_phone
  )
  values (
    p_account_id,
    p_property->>'name',
    nullif(p_property->>'llc_id', '')::uuid,
    p_property->>'address',
    p_property->>'city',
    p_property->>'state',
    p_property->>'zip',
    p_property->>'insurance_provider',
    p_property->>'insurance_policy_number',
    p_property->>'contact_email',
    nullif(p_property->>'purchase_price', '')::numeric(12,2),
    coalesce(nullif(p_property->>'status', ''), 'active'),
    nullif(p_property->>'purchase_date', '')::date,
    p_property->>'property_type',
    p_property->>'purchase_method',
    p_property->>'property_tax_id',
    p_property->>'county',
    p_property->>'township',
    nullif(p_property->>'square_footage', '')::numeric(10,0),
    p_property->>'lot_size',
    p_property->>'municipal_zoning_code',
    p_property->>'county_assessor_use_code',
    nullif(p_property->>'bedroom_count', '')::integer,
    nullif(p_property->>'bathroom_count', '')::numeric(4,1),
    p_property->>'basement',
    nullif(p_property->>'garage_spaces', '')::integer,
    p_property->>'street_parking',
    p_property->>'parking_notes',
    nullif(p_property->>'lot_size_value', '')::numeric,
    p_property->>'lot_size_unit',
    nullif(p_property->>'year_built', '')::integer,
    case when p_property ? 'exterior_wall_materials' and jsonb_typeof(p_property->'exterior_wall_materials') = 'array'
         then array(select jsonb_array_elements_text(p_property->'exterior_wall_materials'))
         else '{}'::text[] end,
    p_property->>'owner_name',
    p_property->>'contact_phone'
  )
  returning id into v_property_id;

  -- A fixed, system-supplied reason — this is the property's first-ever
  -- ownership record, not a correction to a prior state, and the
  -- approved creation-flow UI has no separate reason field of its own
  -- (unlike an existing property's Ownership box, which requires one
  -- for every subsequent change).
  perform replace_property_ownership_interests(
    v_property_id, v_resolved_entries,
    'Initial ownership recorded at property creation.',
    0, p_allocation_status
  );

  update property_creation_requests set property_id = v_property_id where idempotency_key = p_idempotency_key;

  return v_property_id;
end;
$$;

revoke all on function create_property_with_ownership(uuid, uuid, jsonb, jsonb, text) from public;
grant execute on function create_property_with_ownership(uuid, uuid, jsonb, jsonb, text) to authenticated;
