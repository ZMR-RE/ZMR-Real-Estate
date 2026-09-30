-- Fictional fixtures for the disposable database only (T4 entity branding).
\set QUIET on
insert into auth.users (id, email) values
 ('aaaaaaaa-0000-0000-0000-00000000000a', 't4-a@example.test'),
 ('bbbbbbbb-0000-0000-0000-00000000000b', 't4-b@example.test');
insert into accounts (id, name) values ('a0000000-0000-0000-0000-00000000000a', 'T4 A'), ('b0000000-0000-0000-0000-00000000000b', 'T4 B');
insert into account_members (account_id, user_id, role) values
 ('a0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'owner'),
 ('b0000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-00000000000b', 'owner');
insert into llcs (id, account_id, name) values
 ('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Example Holdings LLC'),
 ('eb000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'B Entity LLC');
reset role;
grant select, insert, update, delete on storage.objects to authenticated;
create or replace function t(name text, stmt text, expect text) returns void language plpgsql as $$
begin
  execute stmt;
  if expect = 'ok' then raise notice 'PASS %', name; else raise notice 'FAIL % (expected %, succeeded)', name, expect; end if;
exception when others then
  if expect <> 'ok' and sqlstate = expect then raise notice 'PASS % [%]', name, sqlstate;
  else raise notice 'FAIL % (expected %, got % %)', name, expect, sqlstate, sqlerrm; end if;
end $$;
create or replace function a(name text, expr text) returns void language plpgsql as $$
declare ok boolean;
begin
  execute 'select (' || expr || ')' into ok;
  if ok then raise notice 'PASS %', name; else raise notice 'FAIL % (false: %)', name, expr; end if;
exception when others then raise notice 'FAIL % (% %)', name, sqlstate, sqlerrm;
end $$;
grant execute on function t(text, text, text), a(text, text) to authenticated;
