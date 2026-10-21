-- Candidate only: explicit hosted migration approval required.
-- Review evidence only. Never inserts payments, changes balances or posts Financials.
create table public.mortgage_statement_reviews (
 mortgage_id uuid primary key references public.mortgage_details(id),
 account_id uuid not null references public.accounts(id),
 property_id uuid not null references public.properties(id),
 revision integer not null default 1,
 statements jsonb not null default '{}'::jsonb,
 reviews jsonb not null default '{}'::jsonb,
 completed jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create table public.mortgage_statement_review_events (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id),
 mortgage_id uuid not null references public.mortgage_details(id), actor_id uuid not null references auth.users(id),
 request_id uuid not null, payload jsonb not null, revision integer not null, recorded_at timestamptz not null default now(),
 unique(account_id,mortgage_id,request_id)
);
alter table public.mortgage_statement_reviews enable row level security;
alter table public.mortgage_statement_review_events enable row level security;
create policy mortgage_review_read on public.mortgage_statement_reviews for select to authenticated using(public.is_account_member(account_id));
create policy mortgage_review_events_read on public.mortgage_statement_review_events for select to authenticated using(public.is_account_member(account_id));
revoke all on public.mortgage_statement_reviews,public.mortgage_statement_review_events from public,anon,authenticated;
grant select on public.mortgage_statement_reviews,public.mortgage_statement_review_events to authenticated;

-- Strict amounts: do not round an invalid pasted allocation.
create function public.msr_amount(v text, signed boolean default false) returns numeric
language plpgsql immutable set search_path=pg_catalog,public,pg_temp as $$
begin
 if v is null or v !~ '^-?[0-9]{1,8}(\.[0-9]{1,2})?$' or (not signed and v::numeric<0) then
 raise exception 'Enter a valid dollars-and-cents amount.' using errcode='22023'; end if;
 return v::numeric;
end $$;
revoke all on function public.msr_amount(text,boolean) from public,anon,authenticated;

create function public.msr_validate_line(r jsonb) returns void language plpgsql
set search_path=pg_catalog,public,pg_temp as $$
declare t numeric;p numeric;i numeric;e numeric;f numeric;k text;
begin
 k=r->>'kind';t=public.msr_amount(r->>'total',k='escrow_disbursement');p=public.msr_amount(r->>'principal',k='reversal');
 i=public.msr_amount(r->>'interest');e=public.msr_amount(r->>'escrow',k='escrow_disbursement');f=public.msr_amount(coalesce(r->>'fees','0'));
 if k in ('payment','principal') then
  if t<=0 or t<>p+i+e+f or (k='principal' and (i<>0 or e<>0 or f<>0)) then raise exception 'Allocation must equal total; review each component.' using errcode='22023';end if;
 elsif k='reversal' then
  if t<>0 or p>=0 or i<>0 or e<>0 or f<>0 then raise exception 'Invalid principal reversal.' using errcode='22023';end if;
 elsif k='escrow_disbursement' then
  if t=0 or e<>-abs(t) or p<>0 or i<>0 or f<>0 then raise exception 'Invalid escrow disbursement.' using errcode='22023';end if;
 else raise exception 'Unsupported statement activity.' using errcode='22023';end if;
end $$;
revoke all on function public.msr_validate_line(jsonb) from public,anon,authenticated;

create function public.save_mortgage_statement_review(p_account uuid,p_property uuid,p_mortgage uuid,p_revision integer,p_request uuid,p_command jsonb)
returns public.mortgage_statement_reviews language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare w public.mortgage_statement_reviews; prior public.mortgage_statement_review_events; u public.mortgage_statement_uploads;
 l public.mortgage_details; doc uuid; k text; s jsonb; r jsonb; a jsonb; original jsonb; st jsonb; prev jsonb; entry jsonb;
 source_id text; match_id uuid; n integer; exact_n integer; collisions integer; p_sum numeric; e_sum numeric;
 body jsonb; seen integer[]='{}'; line_no integer; post date; target_date date; previous_date date;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501';end if;
 -- Use the loan lock before any statement/review access; same order as payment writes.
 select ml.* into l from public.mortgage_details ml join public.properties pr on pr.id=ml.property_id and pr.account_id=ml.account_id where ml.id=p_mortgage and ml.account_id=p_account and ml.property_id=p_property for update of ml;
 if not found then raise exception 'Loan does not belong to this account and property.' using errcode='42501';end if;
 if p_request is null or p_revision is null or p_command is null or octet_length(p_command::text)>100000 then raise exception 'Invalid review request.' using errcode='22023';end if;
 body=jsonb_build_object('property',p_property,'revision',p_revision,'command',p_command);
 select * into prior from public.mortgage_statement_review_events where account_id=p_account and mortgage_id=p_mortgage and request_id=p_request;
 if found then
  if prior.actor_id<>auth.uid() or prior.payload<>body then raise exception 'This retry changed. Start a new review request.' using errcode='22023';end if;
  select * into w from public.mortgage_statement_reviews where mortgage_id=p_mortgage;return w;
 end if;
 insert into public.mortgage_statement_reviews(mortgage_id,account_id,property_id) values(p_mortgage,p_account,p_property) on conflict do nothing;
 select * into w from public.mortgage_statement_reviews where mortgage_id=p_mortgage for update;
 if w.revision<>p_revision then raise exception 'Review changed in another window. Refresh; your form entries are retained.' using errcode='40001';end if;
 k=p_command->>'kind';doc=(p_command->>'documentId')::uuid;
 select * into u from public.mortgage_statement_uploads where document_id=doc and account_id=p_account and property_id=p_property and mortgage_id=p_mortgage for share;
 if not found or u.document_kind<>'statement' or u.statement_date is null then raise exception 'Choose a dated statement linked to this loan.' using errcode='22023';end if;
 if p_command->>'digest' is distinct from u.digest or (p_command->>'documentRevision')::integer is distinct from u.revision then raise exception 'Statement changed. Reopen its original before saving.' using errcode='40001';end if;
 if coalesce((p_command->>'confirmed')::boolean,false) is not true then raise exception 'Compare with the original statement first.' using errcode='22023';end if;
 if w.completed ? doc::text and k not in ('reopen','restart') then raise exception 'Completed statement reviews are read-only.' using errcode='22023';end if;
 st=w.statements->doc::text;
 if k not in ('reopen','restart') and st is not null and (st->>'date'<>u.statement_date::text or st->>'digest'<>u.digest) then raise exception 'Statement metadata changed. Review requires an audited restart.' using errcode='40001';end if;
 if k='restart' then
  if st is null or length(btrim(coalesce(p_command->>'note','')))=0 then raise exception 'Choose recorded statement details and explain why they need restarting.' using errcode='22023';end if;
  -- Dependent later period outcomes cannot remain cleared after a source is restarted.
  select coalesce(jsonb_object_agg(t.key,t.value),'{}'::jsonb) into w.completed from jsonb_each(w.completed) t where (w.statements->t.key->>'date')::date<least((st->>'date')::date,u.statement_date);
  select coalesce(jsonb_object_agg(t.key,t.value),'{}'::jsonb) into w.reviews from jsonb_each(w.reviews) t where t.value->'original'->>'documentId'<>doc::text;
  w.statements=w.statements-doc::text;
 elsif k='reopen' then
  if not w.completed ? doc::text or length(btrim(coalesce(p_command->>'note','')))=0 then raise exception 'Choose a completed review and explain why it needs reopening.' using errcode='22023';end if;
  w.completed=w.completed-doc::text;
 elsif k='prepare' then
  if st is not null then raise exception 'Source values are already recorded; use allocation review to correct them.' using errcode='22023';end if;
  s=p_command->'statement'; perform public.msr_amount(s->>'principal');perform public.msr_amount(s->>'escrow',true);
  if jsonb_typeof(s->'activity') is distinct from 'array' or jsonb_array_length(s->'activity')>100 then raise exception 'Record all statement activity (up to 100 lines).' using errcode='22023';end if;
  a='[]'::jsonb;
  for r in select value from jsonb_array_elements(s->'activity') loop
   line_no=(r->>'line')::integer;post=(r->>'postedDate')::date;
   if line_no is null or line_no<1 or line_no=any(seen) or post is null or post>u.statement_date or r->>'postedDate'<>to_char(post,'YYYY-MM-DD') then raise exception 'Review source line numbers and dates.' using errcode='22023';end if;
   seen=array_append(seen,line_no);perform public.msr_validate_line(r);
   a=a||jsonb_build_array(jsonb_build_object('sourceId',u.digest||':'||line_no,'documentId',doc,'digest',u.digest,'line',line_no,'statementDate',u.statement_date,'postedDate',post,'kind',r->>'kind','description',left(coalesce(r->>'description',r->>'kind'),500),'accountId',p_account,'propertyId',p_property,'mortgageId',p_mortgage,'total',r->>'total','principal',r->>'principal','interest',r->>'interest','escrow',r->>'escrow','fees',coalesce(r->>'fees','0.00')));
  end loop;
  w.statements=jsonb_set(w.statements,array[doc::text],jsonb_build_object('documentId',doc,'documentRevision',u.revision,'digest',u.digest,'date',u.statement_date,'principal',s->>'principal','escrow',s->>'escrow','activity',a,'accountId',p_account,'propertyId',p_property,'mortgageId',p_mortgage,'recordedBy',auth.uid(),'recordedAt',now()));
 elsif k in ('review','remove') then
  source_id=p_command->>'sourceId';select value into original from jsonb_array_elements(st->'activity') where value->>'sourceId'=source_id;
  if original is null then raise exception 'Source line not found.' using errcode='22023';end if;
  if k='remove' then w.reviews=w.reviews-source_id;
  else
   a=p_command->'allocation';
   if jsonb_typeof(a) is distinct from 'object' or exists(select 1 from jsonb_object_keys(a) x where x not in ('total','principal','interest','escrow','fees')) then raise exception 'Invalid allocation fields.' using errcode='22023';end if;
   r=original||a;perform public.msr_validate_line(r);
   if exists(select 1 from unnest(array['total','principal','interest','escrow','fees']) x where (coalesce(original->>x,'0'))::numeric is distinct from (coalesce(r->>x,'0'))::numeric) and length(btrim(coalesce(p_command->>'reason','')))=0 then raise exception 'Explain the correction.' using errcode='22023';end if;
   if r->>'kind'='reversal' then
    select x into entry from jsonb_each(w.statements) t cross join lateral jsonb_array_elements(t.value->'activity') x where x->>'sourceId'=p_command->>'reversalOf';
    if entry is null or entry->>'kind' not in ('payment','principal') or (entry->>'postedDate')::date>(r->>'postedDate')::date or (entry->>'principal')::numeric<>-(r->>'principal')::numeric then raise exception 'Link the matching original principal allocation.' using errcode='22023';end if;
   elsif nullif(p_command->>'reversalOf','') is not null then raise exception 'Only reversals link an original allocation.' using errcode='22023';end if;
   match_id=null;
   if r->>'kind' in ('payment','principal') then
    select count(*),count(*) filter(where mortgage_id=p_mortgage and principal_amount=(r->>'principal')::numeric and interest_amount=(r->>'interest')::numeric and (r->>'escrow')::numeric=0 and coalesce((r->>'fees')::numeric,0)=0),min(id::text)::uuid into n,exact_n,match_id
    from (select id,mortgage_id,payment_date,amount,principal_amount,interest_amount from public.mortgage_payments where account_id=p_account and property_id=p_property and not voided union all select id,mortgage_id,payment_date,amount,principal_amount,interest_amount from public.mortgage_history_payments where account_id=p_account and property_id=p_property and not voided) x
    where (mortgage_id=p_mortgage or mortgage_id is null) and payment_date=(r->>'postedDate')::date and amount=(r->>'total')::numeric;
    if n>0 and (n<>1 or exact_n<>1) then raise exception 'An existing payment may match. Resolve its allocation before recording a review.' using errcode='22023';end if;
    select count(*) into collisions from jsonb_each(w.reviews) t where t.key<>source_id and t.value->'original'->>'kind' in ('payment','principal') and t.value->'original'->>'postedDate'=r->>'postedDate' and (t.value->'allocation'->>'total')::numeric=(r->>'total')::numeric;
    if collisions<>coalesce((p_command->>'duplicateAck')::integer,0) or (collisions>0 and length(btrim(coalesce(p_command->>'reason','')))=0) then raise exception 'Same-date same-total review count changed. Compare both sources again.' using errcode='40001';end if;
   end if;
   w.reviews=jsonb_set(w.reviews,array[source_id],jsonb_build_object('sourceId',source_id,'original',original,'allocation',jsonb_build_object('total',r->>'total','principal',r->>'principal','interest',r->>'interest','escrow',r->>'escrow','fees',coalesce(r->>'fees','0.00')),'reason',left(coalesce(p_command->>'reason',''),2000),'reversalOf',p_command->>'reversalOf','existingId',match_id,'action',case when match_id is not null then 'retain_existing' when r->>'kind' in ('reversal','escrow_disbursement') then 'review_adjustment' else 'review_payment' end,'reviewer',auth.uid(),'reviewedAt',now(),'duplicateAck',collisions));
  end if;
 elsif k='complete' then
  if st is null or length(btrim(coalesce(p_command->>'note','')))=0 then raise exception 'Record the statement details and reconciliation outcome first.' using errcode='22023';end if;
  -- No inference from an undated balance. Forward activity remains a separate workflow.
  if l.principal_as_of is null or l.escrow_as_of is null or l.principal_as_of<>l.escrow_as_of or u.statement_date>l.principal_as_of then raise exception 'Confirm matching dated principal and escrow references first.' using errcode='22023';end if;
  if l.principal_version is distinct from (p_command->>'principalVersion')::integer or l.escrow_version is distinct from (p_command->>'escrowVersion')::integer then raise exception 'Loan reference changed; refresh before completing.' using errcode='40001';end if;
  if not exists(select 1 from jsonb_each(w.statements) where value->>'date'=l.principal_as_of::text) then raise exception 'Record the reference statement details first.' using errcode='22023';end if;
  if exists(select 1 from public.mortgage_balance_review_causes where account_id=p_account and review_mortgage_id=p_mortgage and resolved_at is null) then raise exception 'Resolve the open loan balance reviews in the Action Queue first.' using errcode='22023';end if;
  target_date=u.statement_date;
  select value into prev from jsonb_each(w.statements) where (value->>'date')::date<target_date order by (value->>'date')::date desc limit 1;
  if prev is null then raise exception 'An earlier statement is required for this first period.' using errcode='22023';end if;
  previous_date=(prev->>'date')::date;
  if (extract(year from target_date)*12+extract(month from target_date))-(extract(year from previous_date)*12+extract(month from previous_date))>1 then raise exception 'Missing statement month.' using errcode='22023';end if;
  -- Every linked monthly statement in this interval must have captured source values.
  if exists(select 1 from public.mortgage_statement_uploads x where x.account_id=p_account and x.mortgage_id=p_mortgage and x.document_kind='statement' and x.statement_date between previous_date and target_date and (not w.statements ? x.document_id::text or w.statements->x.document_id::text->>'date'<>x.statement_date::text or w.statements->x.document_id::text->>'digest'<>x.digest)) then raise exception 'Review all linked statements in this period.' using errcode='22023';end if;
  p_sum=0;e_sum=0;
  for r in select value from jsonb_array_elements(st->'activity') loop
   entry=w.reviews->(r->>'sourceId');
   if entry is null or (r->>'postedDate')::date<=previous_date then raise exception 'Review every line and overlapping activity first.' using errcode='22023';end if;
   if r->>'kind' in ('payment','principal') then
    select count(*),count(*) filter(where mortgage_id=p_mortgage and principal_amount=(entry->'allocation'->>'principal')::numeric and interest_amount=(entry->'allocation'->>'interest')::numeric and (entry->'allocation'->>'escrow')::numeric=0 and coalesce((entry->'allocation'->>'fees')::numeric,0)=0),min(id::text)::uuid into n,exact_n,match_id
    from (select id,mortgage_id,payment_date,amount,principal_amount,interest_amount from public.mortgage_payments where account_id=p_account and property_id=p_property and not voided union all select id,mortgage_id,payment_date,amount,principal_amount,interest_amount from public.mortgage_history_payments where account_id=p_account and property_id=p_property and not voided) x
    where (mortgage_id=p_mortgage or mortgage_id is null) and payment_date=(r->>'postedDate')::date and amount=(entry->'allocation'->>'total')::numeric;
    if (n>0 and (n<>1 or exact_n<>1)) or match_id is distinct from (entry->>'existingId')::uuid then raise exception 'Existing payment match changed. Review this activity again.' using errcode='40001';end if;
   end if;
   p_sum=p_sum+(entry->'allocation'->>'principal')::numeric;e_sum=e_sum+(entry->'allocation'->>'escrow')::numeric;
  end loop;
  if (st->>'principal')::numeric<>(prev->>'principal')::numeric-p_sum or (st->>'escrow')::numeric<>(prev->>'escrow')::numeric+e_sum then raise exception 'Principal or escrow does not reconcile to the previous statement.' using errcode='22023';end if;
  w.completed=jsonb_set(w.completed,array[doc::text],jsonb_build_object('reviewer',auth.uid(),'at',now(),'note',left(p_command->>'note',2000),'principalVersion',l.principal_version,'escrowVersion',l.escrow_version));
 else raise exception 'Unsupported review action.' using errcode='22023';end if;
 w.revision=w.revision+1;
 update public.mortgage_statement_reviews set revision=w.revision,statements=w.statements,reviews=w.reviews,completed=w.completed,updated_at=now() where mortgage_id=p_mortgage returning * into w;
 insert into public.mortgage_statement_review_events(account_id,mortgage_id,actor_id,request_id,payload,revision) values(p_account,p_mortgage,auth.uid(),p_request,body,w.revision);
 return w;
end $$;
revoke all on function public.save_mortgage_statement_review(uuid,uuid,uuid,integer,uuid,jsonb) from public,anon;
grant execute on function public.save_mortgage_statement_review(uuid,uuid,uuid,integer,uuid,jsonb) to authenticated;
