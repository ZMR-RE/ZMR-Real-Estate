-- Mortgage integrity release: READ-ONLY post-apply checks (T1). Raises 'STOP: …' on any mismatch.
\set ON_ERROR_STOP 1
do $$
declare n int;
begin
  select count(*) into n from supabase_migrations.schema_migrations;
  if n <> 120 then raise exception 'STOP: expected 120 applied migrations, found %', n; end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261004100000') then
    raise exception 'STOP: 20261004100000 not recorded'; end if;
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname in ('void_mortgage_activity','reset_mortgage_balance','acknowledge_mortgage_review_cause','mortgage_void_core','mortgage_close_entry_causes');
  if n <> 5 then raise exception 'STOP: expected 5 integrity functions, found %', n; end if;
  select count(*) into n from pg_trigger where not tgisinternal
   and tgrelid in ('public.mortgage_details'::regclass,'public.mortgage_payments'::regclass,'public.mortgage_escrow_transactions'::regclass);
  if n <> 11 then raise exception 'STOP: expected 11 triggers on the mortgage tables, found %', n; end if;
  if not (select bool_and(relrowsecurity) from pg_class where oid in ('public.mortgage_balance_effects'::regclass,'public.mortgage_balance_review_causes'::regclass)) then
    raise exception 'STOP: RLS is not enabled on the integrity tables'; end if;
  -- backfill on existing loans: figure-entered times = their own updated_at; counters 0; statement dates unknown
  select count(*) into n from public.mortgage_details
   where principal_figure_at is distinct from updated_at or escrow_figure_at is distinct from updated_at
      or principal_version <> 0 or escrow_version <> 0 or principal_epoch <> 0 or escrow_epoch <> 0
      or principal_as_of is not null or escrow_as_of is not null;
  if n <> 0 then raise exception 'STOP: % loan row(s) not backfilled as specified', n; end if;
  -- no history is guessed: existing entries stay unlinked, nothing recorded for them
  select count(*) into n from public.mortgage_payments where mortgage_id is not null or void_outcome is not null;
  if n <> 0 then raise exception 'STOP: % existing payment(s) changed by the migration', n; end if;
  select count(*) into n from public.mortgage_escrow_transactions where mortgage_id is not null or void_outcome is not null;
  if n <> 0 then raise exception 'STOP: % existing escrow entr(y/ies) changed by the migration', n; end if;
  if (select count(*) from public.mortgage_balance_effects) <> 0 or (select count(*) from public.mortgage_balance_review_causes) <> 0 then
    raise exception 'STOP: effects or causes were created by the migration'; end if;
  raise notice 'POST-APPLY CHECKS PASSED';
end $$;
