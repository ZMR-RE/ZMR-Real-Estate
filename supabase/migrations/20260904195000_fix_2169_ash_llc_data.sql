-- Data fix: "2169 Ash LLC" was created by the 20260904193000 migration
-- purely from an address-based naming-pattern assumption when migrating
-- properties.llc_name into real llc rows — it was never verified to
-- correspond to an actual legal entity. Unlink 2169 Ash St from it (llc_id
-- has ON DELETE RESTRICT, so the property must be unlinked first) and set
-- the property to individually-owned/no-LLC (llc_id = null), then remove
-- the fabricated LLC row since it doesn't correspond to anything real.
do $$
declare
  v_account_id uuid;
  v_llc_id uuid;
begin
  select id into v_account_id from accounts where name = 'ZMR Real Estate' limit 1;
  select id into v_llc_id from llcs where account_id = v_account_id and name = '2169 Ash LLC' limit 1;

  if v_llc_id is not null then
    update properties
    set llc_id = null
    where account_id = v_account_id and llc_id = v_llc_id;

    delete from llcs where id = v_llc_id;
  end if;
end $$;
