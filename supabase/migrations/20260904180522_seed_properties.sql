-- Roadmap item 1.2 — seed the two real properties so the Property Registry
-- has actual data to view/edit. llc_name follows the address-based naming
-- pattern already noted in schema.sql. City/state are only filled in where
-- explicitly known (2169 Ash St, Des Plaines, IL) — left blank for 5336 W
-- Foster Ave rather than guessing, for the owner to fill in.
do $$
declare
  v_account_id uuid;
begin
  select id into v_account_id from accounts where name = 'ZMR Real Estate' limit 1;

  insert into properties (account_id, name, llc_name, address)
  select v_account_id, '5336 W Foster Ave', '5336 W Foster LLC', '5336 W Foster Ave'
  where not exists (
    select 1 from properties where account_id = v_account_id and name = '5336 W Foster Ave'
  );

  insert into properties (account_id, name, llc_name, address, city, state)
  select v_account_id, '2169 Ash St', '2169 Ash LLC', '2169 Ash St', 'Des Plaines', 'IL'
  where not exists (
    select 1 from properties where account_id = v_account_id and name = '2169 Ash St'
  );
end $$;
