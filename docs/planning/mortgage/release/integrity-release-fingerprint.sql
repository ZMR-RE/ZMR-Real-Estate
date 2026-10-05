-- Mortgage integrity release: fingerprint of every EXISTING field (T1). Run before and after; the output must be identical.
-- The migration's new columns are excluded by name, so the backfill of new columns doesn't count as a change.
\pset format unaligned
\pset tuples_only on
with x(k) as (select array['principal_version','escrow_version','principal_epoch','escrow_epoch','principal_as_of','escrow_as_of','principal_figure_at','escrow_figure_at','mortgage_id','void_reason','void_outcome']::text[])
select 'mortgage_details|' || count(*) || '|' || md5(coalesce(string_agg(md5((to_jsonb(r) - (select k from x))::text), ',' order by r.id), '')) from public.mortgage_details r
union all select 'mortgage_payments|' || count(*) || '|' || md5(coalesce(string_agg(md5((to_jsonb(r) - (select k from x))::text), ',' order by r.id), '')) from public.mortgage_payments r
union all select 'mortgage_escrow_transactions|' || count(*) || '|' || md5(coalesce(string_agg(md5((to_jsonb(r) - (select k from x))::text), ',' order by r.id), '')) from public.mortgage_escrow_transactions r
union all select 'audit_log|' || count(*) || '|' || md5(coalesce(string_agg(md5(to_jsonb(r)::text), ',' order by r.id), '')) from public.audit_log r
union all select t.table_name || '|count|' || (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', t.table_name), false, true, '')))[1]::text
  from information_schema.tables t
 where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
   and t.table_name not in ('mortgage_details','mortgage_payments','mortgage_escrow_transactions','audit_log','mortgage_balance_effects','mortgage_balance_review_causes')
order by 1;
