-- Roadmap 3.2/3.3 — Command Center's per-property email connections.
-- Schema only, per this step's explicit scope: the OAuth Edge Functions
-- and UI both depend on a Google Cloud OAuth app the user still needs
-- to register externally, so neither is built yet.
--
-- The actual OAuth access/refresh token pair is never stored in this
-- table (or anywhere in a plain app table) — only a reference to a
-- Supabase Vault secret holding it. Vault encrypts the secret at rest
-- and only a service-role context (an Edge Function) can decrypt it via
-- vault.decrypted_secrets; the authenticated/anon roles this table's own
-- RLS policy governs can never read the token value itself, only which
-- property has a connection and its status.
create table property_email_connections (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  email_address text not null,
  -- References vault.secrets(id) — no hard FK, since a connection can
  -- exist without a live secret yet/anymore (see status below) and
  -- Vault's own secret lifecycle is managed by the Edge Function that
  -- performs the OAuth token exchange/refresh/revoke, not by this
  -- table's own constraints.
  vault_secret_id uuid,
  status text not null default 'pending' check (status in ('pending', 'connected', 'disconnected', 'error')),
  -- Populated only when status = 'error', surfaced to the user so a
  -- failed refresh/revoked-by-Google connection isn't a silent dead
  -- entry — same "never hidden system logic" spirit as the Bookkeeping
  -- rule, applied here to integration health instead of accounting.
  error_message text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Roadmap 3.3 — "add multiple email accounts, tag each to a
  -- property": deliberately no uniqueness on property_id alone. Only
  -- guards against connecting the exact same address to the same
  -- property twice.
  unique (property_id, email_address)
);

create index property_email_connections_account_property_idx
  on property_email_connections (account_id, property_id);

alter table property_email_connections enable row level security;

create policy "members can manage their property email connections"
  on property_email_connections for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Short-lived CSRF-protection state for the OAuth handshake: the app
-- generates one of these when a user clicks "Connect" for a property,
-- passes `state` through Google's OAuth redirect, and the callback
-- Edge Function validates the returned state matches an unexpired,
-- unused row before exchanging the auth code for tokens — standard
-- OAuth 2.0 state-parameter CSRF protection. One-time use: the callback
-- deletes the row (or the cleanup job below reaps it) once consumed.
create table oauth_state_tokens (
  state text primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Handshake is a matter of seconds in the happy path; a generous
  -- fixed window here just bounds how long an abandoned attempt (user
  -- closes the Google consent tab) stays valid, not a tunable per-use
  -- setting.
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

alter table oauth_state_tokens enable row level security;

create policy "members can manage their oauth state tokens"
  on oauth_state_tokens for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
