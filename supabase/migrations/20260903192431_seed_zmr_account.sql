-- Roadmap item 1.1 — create the ZMR Real Estate account and link its first
-- (owner) user, created manually via the Supabase dashboard since there is
-- no public signup flow yet. The user id below is Janki637@gmail.com's
-- Supabase Auth User UID (Authentication -> Users -> user detail page).
do $$
declare
  v_account_id uuid;
  v_user_id uuid := '839171ad-d835-4e00-84c8-773f84889d6d';
begin
  select id into v_account_id from accounts where name = 'ZMR Real Estate' limit 1;

  if v_account_id is null then
    insert into accounts (name) values ('ZMR Real Estate') returning id into v_account_id;
  end if;

  insert into account_members (account_id, user_id, role)
  select v_account_id, v_user_id, 'owner'
  where not exists (
    select 1 from account_members where account_id = v_account_id and user_id = v_user_id
  );
end $$;
