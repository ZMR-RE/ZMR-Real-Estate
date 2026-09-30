-- Minimal local stand-in for the Supabase platform objects the repo's migrations reference.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage; create schema extensions;
create extension if not exists pgcrypto with schema extensions;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
-- Mirror hosted Supabase: new public tables/views are granted to anon too
-- (row-level security still applies).
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to authenticated, service_role;
alter default privileges in schema public grant execute on functions to authenticated, service_role;
grant execute on function auth.uid() to authenticated;
-- the seed migration links this fixed owner id; fictional placeholder only
insert into auth.users (id, email) values ('839171ad-d835-4e00-84c8-773f84889d6d', 'placeholder@example.test');
