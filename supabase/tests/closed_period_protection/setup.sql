-- fictional fixtures, disposable DB only
insert into auth.users (id, email) values
 ('aaaaaaaa-0000-0000-0000-00000000000a','t2-a@example.test'),('bbbbbbbb-0000-0000-0000-00000000000b','t2-b@example.test');
insert into accounts (id, name) values ('a0000000-0000-0000-0000-00000000000a','T2 A'),('b0000000-0000-0000-0000-00000000000b','T2 B');
insert into account_members (account_id, user_id, role) values
 ('a0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a','owner'),
 ('b0000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-00000000000b','owner');
insert into properties (id, account_id, address) values
 ('a1000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-00000000000a','1 T2 A St'),
 ('b1000000-0000-0000-0000-00000000000b','b0000000-0000-0000-0000-00000000000b','1 T2 B St');
insert into vendors (id, account_id, name) values
 ('a2000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-00000000000a','T2 A vendor'),
 ('b2000000-0000-0000-0000-00000000000b','b0000000-0000-0000-0000-00000000000b','T2 B vendor');
insert into tenants (id, account_id, name) values
 ('a3000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-00000000000a','T2 A tenant'),
 ('b3000000-0000-0000-0000-00000000000b','b0000000-0000-0000-0000-00000000000b','T2 B tenant');
create or replace function t(name text, stmt text, expect text) returns void language plpgsql as $$
begin
  execute stmt;
  if expect = 'ok' then raise notice 'PASS %', name; else raise notice 'FAIL % (expected %, succeeded)', name, expect; end if;
exception when others then
  if expect <> 'ok' and sqlstate = expect then raise notice 'PASS % [%]', name, sqlstate;
  else raise notice 'FAIL % (expected %, got % %)', name, expect, sqlstate, sqlerrm; end if;
end $$;
grant execute on function t(text,text,text) to authenticated;
