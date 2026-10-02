-- DRAFT forward migration, NOT APPROVED. Blocks NEW history-only entries; keeps every existing row, the duplicate rule
-- (normal inserts are still checked against history rows), voids of existing history rows, and the audit triggers.
-- To use: review, approve, copy into supabase/migrations/ with a new timestamp, exact-set apply. Never "repair reverted".
create or replace function mortgage_history_inserts_disabled()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'Recording history entries is temporarily switched off. Nothing was saved.' using errcode = 'ZM5MC';
end;
$$;
revoke all on function mortgage_history_inserts_disabled() from public, anon, authenticated;
create trigger mortgage_history_payments_inserts_disabled before insert on mortgage_history_payments
  for each row execute function mortgage_history_inserts_disabled();
create trigger mortgage_history_escrow_inserts_disabled before insert on mortgage_history_escrow
  for each row execute function mortgage_history_inserts_disabled();
