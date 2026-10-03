-- Mortgage integrity release: READ-ONLY preflight (T1). Raises 'STOP: …' on any mismatch.
\set ON_ERROR_STOP 1
do $$
declare n int;
begin
  select count(*) into n from supabase_migrations.schema_migrations;
  if n <> 119 then raise exception 'STOP: expected 119 applied migrations, found %', n; end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20261004100000') then
    raise exception 'STOP: 20261004100000 is already recorded as applied'; end if;
  if to_regclass('public.mortgage_balance_effects') is not null or to_regclass('public.mortgage_balance_review_causes') is not null then
    raise exception 'STOP: integrity tables already exist'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mortgage_details'
             and column_name in ('principal_version','escrow_version','principal_epoch','escrow_epoch','principal_as_of','escrow_as_of','principal_figure_at','escrow_figure_at')) then
    raise exception 'STOP: integrity columns already exist on mortgage_details'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name in ('mortgage_payments','mortgage_escrow_transactions')
             and column_name in ('mortgage_id','void_reason','void_outcome')) then
    raise exception 'STOP: integrity columns already exist on the entry tables'; end if;
  -- the Sep 15 cleanup ran first (2026-10-02): its two rows must be gone
  if exists (select 1 from public.mortgage_payments where id = '2a7b6825-10dc-44d7-a057-60918027c2fb')
     or exists (select 1 from public.mortgage_escrow_transactions where id = '7b0b32b9-701d-47e6-b8a0-7e8832beccd4') then
    raise exception 'STOP: the Sep 15 test entries are present; the cleanup must precede this release'; end if;
  raise notice 'PREFLIGHT PASSED';
end $$;
