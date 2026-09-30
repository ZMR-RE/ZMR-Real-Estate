-- T4 — Entity branding & documents (owner-approved: logo, four optional
-- colour roles, issuer/contact details, document defaults).
--
-- Self-contained: depends only on existing tables (llcs, accounts, storage),
-- NOT on the unreleased Stage 1 invoice migrations, so it can ship alone.
-- Uses the EXISTING entity record (llcs) — a one-to-one settings row, not a
-- second issuer record. Entity stationery affects only documents the entity
-- issues; the workspace theme is untouched.
-- Error codes ZM350–ZM359.

create table entity_document_branding (
  entity_id uuid primary key references llcs(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  -- Four optional colour roles; null = standard document colours.
  heading_color text,
  accent_color text,
  highlight_color text,
  secondary_color text,
  -- Issuer/contact details printed on documents (name and address stay on
  -- the entity's Identity fields).
  reply_to_email text,
  document_phone text,
  website text,
  payment_instructions text,
  -- Document defaults.
  paper_size text not null default 'letter' check (paper_size in ('letter', 'a4')),
  show_legal_name boolean not null default true,
  default_invoice_note text,
  default_receipt_note text,
  document_footer text,
  current_logo_id uuid,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint entity_branding_colors_hex check (
    (heading_color is null or heading_color ~ '^#[0-9A-F]{6}$') and
    (accent_color is null or accent_color ~ '^#[0-9A-F]{6}$') and
    (highlight_color is null or highlight_color ~ '^#[0-9A-F]{6}$') and
    (secondary_color is null or secondary_color ~ '^#[0-9A-F]{6}$')
  )
);

-- Every uploaded logo is kept as its own version (issued documents may
-- reference any of them). Insert-only.
create table entity_logo_versions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  entity_id uuid not null references llcs(id) on delete cascade,
  storage_path text not null unique,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  format text not null check (format in ('PNG', 'JPEG')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  byte_size integer not null check (byte_size > 0 and byte_size <= 1000000),
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id) default auth.uid()
);
create index entity_logo_versions_entity_idx on entity_logo_versions (entity_id, uploaded_at desc);

alter table entity_document_branding
  add constraint entity_branding_current_logo_fk foreign key (current_logo_id) references entity_logo_versions(id) on delete restrict;

alter table entity_document_branding enable row level security;
alter table entity_logo_versions enable row level security;
create policy "members manage their entity branding" on entity_document_branding for all
  using (is_account_member(account_id)) with check (is_account_member(account_id));
create policy "members read their logo versions" on entity_logo_versions for select
  using (is_account_member(account_id));
create policy "members add logo versions" on entity_logo_versions for insert
  with check (is_account_member(account_id));

-- WCAG relative luminance / contrast, for the colour-role rule.
create or replace function srgb_channel(p_v integer) returns numeric language sql immutable as $$
  select case when p_v / 255.0 <= 0.03928 then (p_v / 255.0) / 12.92 else power(((p_v / 255.0) + 0.055) / 1.055, 2.4) end
$$;

create or replace function hex_luminance(p_hex text) returns numeric language sql immutable as $$
  select 0.2126 * srgb_channel(('x' || substr(p_hex, 2, 2))::bit(8)::int)
       + 0.7152 * srgb_channel(('x' || substr(p_hex, 4, 2))::bit(8)::int)
       + 0.0722 * srgb_channel(('x' || substr(p_hex, 6, 2))::bit(8)::int)
$$;

create or replace function hex_contrast(p_a text, p_b text) returns numeric language sql immutable as $$
  select (greatest(hex_luminance(p_a), hex_luminance(p_b)) + 0.05) / (least(hex_luminance(p_a), hex_luminance(p_b)) + 0.05)
$$;

-- The accent band is the accent colour mixed 88% toward white (same as the
-- document renderer), so labels on it stay readable.
create or replace function hex_tint(p_hex text, p_pct numeric) returns text language sql immutable as $$
  select '#' || upper(
    lpad(to_hex(round(r + (255 - r) * p_pct)::int), 2, '0') ||
    lpad(to_hex(round(g + (255 - g) * p_pct)::int), 2, '0') ||
    lpad(to_hex(round(b + (255 - b) * p_pct)::int), 2, '0'))
  from (select ('x' || substr(p_hex, 2, 2))::bit(8)::int as r,
               ('x' || substr(p_hex, 4, 2))::bit(8)::int as g,
               ('x' || substr(p_hex, 6, 2))::bit(8)::int as b) c
$$;

create or replace function entity_branding_guard() returns trigger language plpgsql set search_path = public as $$
declare
  v_secondary text := coalesce(new.secondary_color, '#5B6472');
  v_accent text := coalesce(new.accent_color, '#5B6472');
  v_role record;
begin
  if not exists (select 1 from llcs where id = new.entity_id and account_id = new.account_id) then
    raise exception 'Branding must belong to the same account as the entity' using errcode = 'ZM350';
  end if;
  if coalesce(new.heading_color, '#000000') !~ '^#[0-9A-F]{6}$' or coalesce(new.accent_color, '#000000') !~ '^#[0-9A-F]{6}$'
     or coalesce(new.highlight_color, '#000000') !~ '^#[0-9A-F]{6}$' or coalesce(new.secondary_color, '#000000') !~ '^#[0-9A-F]{6}$' then
    raise exception 'Colours must look like #1F4E79 (six hex digits, uppercase)' using errcode = 'ZM355';
  end if;
  if new.current_logo_id is not null
     and not exists (select 1 from entity_logo_versions where id = new.current_logo_id and entity_id = new.entity_id) then
    raise exception 'The logo must be one of this entity''s uploaded logos' using errcode = 'ZM351';
  end if;
  for v_role in select * from (values ('Heading', new.heading_color), ('Highlight', new.highlight_color), ('Secondary text', new.secondary_color)) as r(label, color) loop
    if v_role.color is not null and hex_contrast(v_role.color, '#FFFFFF') < 4.5 then
      raise exception '% colour % is too light to read on white (needs 4.5:1)', v_role.label, v_role.color using errcode = 'ZM352';
    end if;
  end loop;
  if hex_contrast(v_secondary, hex_tint(v_accent, 0.88)) < 4.5 then
    raise exception 'Table header labels would be hard to read on this accent colour (needs 4.5:1)' using errcode = 'ZM352';
  end if;
  if tg_op = 'UPDATE' then new.version = old.version + 1; end if;
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end $$;

create trigger entity_branding_guard before insert or update on entity_document_branding
  for each row execute function entity_branding_guard();

create or replace function entity_logo_versions_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op <> 'INSERT' then
    raise exception 'Logo versions are kept permanently' using errcode = 'ZM353';
  end if;
  if not exists (select 1 from llcs where id = new.entity_id and account_id = new.account_id) then
    raise exception 'Logo must belong to the same account as the entity' using errcode = 'ZM350';
  end if;
  if new.storage_path not like new.account_id::text || '/entity-branding/' || new.entity_id::text || '/%' then
    raise exception 'Logo must be stored under this entity''s branding folder' using errcode = 'ZM354';
  end if;
  return new;
end $$;

create trigger entity_logo_versions_guard before insert or update or delete on entity_logo_versions
  for each row execute function entity_logo_versions_guard();

-- Logo files are never deleted or overwritten by members (issued documents
-- may reference any version). Restrictive — ANDed with the documents
-- bucket's existing permissive policy, which is unchanged.
create policy "entity logo files are permanent (no delete)"
  on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'documents' or name not like '%/entity-branding/%');

create policy "entity logo files are permanent (no overwrite)"
  on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'documents' or name not like '%/entity-branding/%');

-- Owner-only (owner-approved September 30, 2026): only the portfolio OWNER
-- changes what an entity's documents print. Other members keep read access.
-- "Owner" is the existing account_members.role; no membership is changed.
-- Triggers (not restrictive RLS) so a refused edit raises a clear error
-- instead of silently changing nothing. Error code ZM370 (shared with the
-- invoicing release, 20261002160000, which repeats this same helper).
create or replace function is_account_owner(target_account_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from account_members
    where account_id = target_account_id and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function require_owner_for_branding() returns trigger
language plpgsql set search_path = public as $$
begin
  -- Dashboard sign-ins (authenticated/anon) must be the owner. Server-side
  -- maintenance roles are outside dashboard access control, as with RLS.
  if current_user in ('authenticated', 'anon')
     and not is_account_owner(case when tg_op = 'DELETE' then old.account_id else new.account_id end) then
    raise exception 'Only the portfolio owner can change branding & documents in this release'
      using errcode = 'ZM370',
            hint = 'Your access to this portfolio doesn''t include document settings. Ask the owner to make this change.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger a0_owner_only before insert or update or delete on entity_document_branding
  for each row execute function require_owner_for_branding();
create trigger a0_owner_only before insert or update or delete on entity_logo_versions
  for each row execute function require_owner_for_branding();

create policy "entity logo files are uploaded by the owner"
  on storage.objects as restrictive for insert to authenticated
  with check (
    bucket_id <> 'documents'
    or name not like '%/entity-branding/%'
    or case when split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
            then public.is_account_owner(split_part(name, '/', 1)::uuid) else false end
  );
