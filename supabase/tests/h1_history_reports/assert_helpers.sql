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
