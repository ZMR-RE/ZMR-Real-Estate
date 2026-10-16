-- Local candidate. No accounting rows are created by document intake.
create table public.document_intakes (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.accounts(id),
 request_id uuid not null,
 digest text not null check(digest ~ '^[0-9a-f]{64}$'),
 filename text not null check(length(filename) between 1 and 255),
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif')),
 file_size bigint not null check(file_size between 1 and 26214400),
 storage_path text not null unique,
 request_payload jsonb not null,
 details jsonb not null,
 property_id uuid generated always as (nullif(details->>'propertyId','')::uuid) stored references public.properties(id),
 unit_id uuid generated always as (nullif(details->>'unitId','')::uuid) stored references public.units(id),
 vendor_id uuid generated always as (nullif(details->>'vendorId','')::uuid) stored references public.vendors(id),
 status text not null default 'uploading' check(status in ('uploading','needs_review','filed')),
 revision integer not null default 1,
 document_id uuid unique references public.documents(id) on delete restrict,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(account_id,request_id),
 check((status='filed') = (document_id is not null))
);
create table public.document_intake_events (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.accounts(id),
 intake_id uuid not null references public.document_intakes(id),
 actor_id uuid not null references auth.users(id),
 event text not null check(event in ('reserved','captured','details_updated','filed','renamed')),
 context jsonb not null default '{}'::jsonb,
 recorded_at timestamptz not null default now()
);
alter table public.document_intakes enable row level security;
alter table public.document_intake_events enable row level security;
create policy document_intake_read on public.document_intakes for select to authenticated using(public.is_account_member(account_id));
create policy document_intake_event_read on public.document_intake_events for select to authenticated using(public.is_account_member(account_id));
revoke all on public.document_intakes,public.document_intake_events from public,anon,authenticated;
grant select on public.document_intakes,public.document_intake_events to authenticated;
create index document_intake_account_status on public.document_intakes(account_id,status,created_at);

-- Private validation shared by capture and review. Every supplied relationship
-- is validated, even though none is required for initial intake.
create function public.check_document_intake_details(p_account uuid,p_details jsonb,p_filing boolean)
returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare prop uuid; unit uuid; vendor uuid; category text; key text; dt text;
begin
 if jsonb_typeof(p_details) is distinct from 'object' then raise exception 'Invalid document details.'; end if;
 for key in select jsonb_object_keys(p_details) loop
  if key not in ('title','propertyId','unitId','category','documentDate','notes','vendorId','responsibility','dueDate') then raise exception 'Unknown document field.'; end if;
  if jsonb_typeof(p_details->key) not in ('string','null') then raise exception 'Invalid document field.'; end if;
 end loop;
 if length(coalesce(p_details->>'title',''))>255 or length(coalesce(p_details->>'notes',''))>10000 then raise exception 'Document title or notes are too long.'; end if;
 prop=nullif(p_details->>'propertyId','')::uuid; unit=nullif(p_details->>'unitId','')::uuid;
 vendor=nullif(p_details->>'vendorId','')::uuid; category=nullif(btrim(p_details->>'category'),'');
 if p_filing and (prop is null or category is null) then raise exception 'Choose a property and document category before filing.'; end if;
 if prop is not null and not exists(select 1 from public.properties where id=prop and account_id=p_account) then raise exception 'Property does not belong to this account.' using errcode='42501'; end if;
 if unit is not null and not exists(select 1 from public.units where id=unit and property_id=prop and account_id=p_account and not archived) then raise exception 'Choose an active unit on this property.' using errcode='42501'; end if;
 if vendor is not null and not exists(select 1 from public.vendors where id=vendor and account_id=p_account and not archived) then raise exception 'Choose an active vendor in this account.' using errcode='42501'; end if;
 if category is not null and not exists(select 1 from public.pick_list_options where account_id=p_account and list_name='document_type' and value=category and active) then raise exception 'Choose an active document category.'; end if;
 if coalesce(p_details->>'responsibility','') not in ('','unsure','tenant','owner','shared') then raise exception 'Invalid responsibility.'; end if;
 foreach key in array array['documentDate','dueDate'] loop
  dt=nullif(p_details->>key,'');
  if dt is not null and (dt !~ '^\d{4}-\d{2}-\d{2}$' or to_char(dt::date,'YYYY-MM-DD')<>dt) then raise exception 'Enter a valid date.'; end if;
 end loop;
end $$;
revoke all on function public.check_document_intake_details(uuid,jsonb,boolean) from public,anon,authenticated;

create function public.reserve_document_intake(p_account uuid,p_request uuid,p_digest text,p_filename text,p_mime text,p_size bigint,p_details jsonb)
returns public.document_intakes language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.document_intakes; payload jsonb; new_id uuid;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_request is null then raise exception 'Capture request is required.'; end if;
 payload=jsonb_build_object('digest',p_digest,'filename',p_filename,'mime',p_mime,'size',p_size,'details',p_details);
 perform pg_advisory_xact_lock(hashtextextended(p_account::text||p_request::text,0));
 select * into r from public.document_intakes where account_id=p_account and request_id=p_request;
 if found then
  if r.request_payload is distinct from payload then raise exception 'This capture changed. Retry the original or start a new capture.' using errcode='PT409'; end if;
  return r;
 end if;
 perform public.check_document_intake_details(p_account,p_details,false);
 new_id=gen_random_uuid();
 insert into public.document_intakes(id,account_id,request_id,digest,filename,mime_type,file_size,storage_path,request_payload,details,created_by)
 values(new_id,p_account,p_request,p_digest,p_filename,p_mime,p_size,p_account::text||'/capture-intake/'||new_id::text,payload,p_details,auth.uid()) returning * into r;
 insert into public.document_intake_events(account_id,intake_id,actor_id,event) values(p_account,r.id,auth.uid(),'reserved');
 return r;
end $$;
revoke all on function public.reserve_document_intake(uuid,uuid,text,text,text,bigint,jsonb) from public,anon;
grant execute on function public.reserve_document_intake(uuid,uuid,text,text,text,bigint,jsonb) to authenticated;

create function public.finish_document_intake(p_account uuid,p_intake uuid)
returns public.document_intakes language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.document_intakes;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501'; end if;
 select * into r from public.document_intakes where id=p_intake and account_id=p_account for update;
 if not found then raise exception 'Capture unavailable.' using errcode='42501'; end if;
 if r.status<>'uploading' then return r; end if;
 if not exists(select 1 from storage.objects where bucket_id='documents' and name=r.storage_path and (metadata->>'size')::bigint=r.file_size and metadata->>'mimetype'=r.mime_type) then raise exception 'The stored file is incomplete. Retry the upload.'; end if;
 update public.document_intakes set status='needs_review',revision=revision+1 where id=r.id returning * into r;
 insert into public.document_intake_events(account_id,intake_id,actor_id,event) values(p_account,r.id,auth.uid(),'captured');
 return r;
end $$;
revoke all on function public.finish_document_intake(uuid,uuid) from public,anon;
grant execute on function public.finish_document_intake(uuid,uuid) to authenticated;

create function public.review_document_intake(p_account uuid,p_intake uuid,p_revision integer,p_details jsonb,p_file boolean)
returns public.document_intakes language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.document_intakes; doc uuid;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501'; end if;
 select * into r from public.document_intakes where id=p_intake and account_id=p_account for update;
 if not found then raise exception 'Capture unavailable.' using errcode='42501'; end if;
 if p_file is null then raise exception 'Choose a review action.'; end if;
 -- Lost-response retry succeeds only for the same completed action.
 if r.status='filed' then
  if p_file and r.details=p_details then return r; end if;
  raise exception 'Already filed. Open the document to see its current details.' using errcode='PT409';
 end if;
 if r.status<>'needs_review' then raise exception 'Finish the upload before review.'; end if;
 if p_revision is distinct from r.revision then raise exception 'This document changed. Reopen review; your entries were not saved.' using errcode='PT409'; end if;
 perform public.check_document_intake_details(p_account,p_details,p_file);
 if p_file then
  if not exists(select 1 from storage.objects where bucket_id='documents' and name=r.storage_path and (metadata->>'size')::bigint=r.file_size) then raise exception 'Original file unavailable. Nothing was filed.'; end if;
  insert into public.documents(account_id,property_id,unit_id,category,label,storage_path,file_size,uploaded_by)
  values(p_account,(p_details->>'propertyId')::uuid,nullif(p_details->>'unitId','')::uuid,p_details->>'category',coalesce(nullif(btrim(p_details->>'title'),''),r.filename),r.storage_path,r.file_size,auth.uid()) returning id into doc;
 end if;
 insert into public.document_intake_events(account_id,intake_id,actor_id,event,context)
 values(p_account,r.id,auth.uid(),case when p_file then 'filed' else 'details_updated' end,jsonb_build_object('before',r.details,'after',p_details,'document_id',doc));
 update public.document_intakes set details=p_details,document_id=doc,status=case when p_file then 'filed' else 'needs_review' end,revision=revision+1 where id=r.id returning * into r;
 return r;
end $$;
revoke all on function public.review_document_intake(uuid,uuid,integer,jsonb,boolean) from public,anon;
grant execute on function public.review_document_intake(uuid,uuid,integer,jsonb,boolean) to authenticated;

-- Restrictive policies preserve all ordinary document policies, while making
-- intake originals immutable and preventing writes to unreserved intake paths.
create function public.intake_storage_allowed(p_path text,p_insert boolean) returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select case when split_part(p_path,'/',2)<>'capture-intake' then true
 else p_insert and exists(select 1 from public.document_intakes where storage_path=p_path and status='uploading' and public.is_account_member(account_id)) end
$$;
revoke all on function public.intake_storage_allowed(text,boolean) from public,anon;
grant execute on function public.intake_storage_allowed(text,boolean) to authenticated;
create policy intake_original_insert on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'documents' or public.intake_storage_allowed(name,true));
create policy intake_original_update on storage.objects as restrictive for update to authenticated
 using(bucket_id<>'documents' or public.intake_storage_allowed(name,false))
 with check(bucket_id<>'documents' or public.intake_storage_allowed(name,false));
create policy intake_original_delete on storage.objects as restrictive for delete to authenticated
 using(bucket_id<>'documents' or public.intake_storage_allowed(name,false));

create function public.guard_intake_document() returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if exists(select 1 from public.document_intakes where document_id=old.id) then
  if tg_op='DELETE' then raise exception 'This document is retained in capture history.'; end if;
  if (new.account_id,new.property_id,new.unit_id,new.storage_path,new.file_size,new.transaction_id) is distinct from (old.account_id,old.property_id,old.unit_id,old.storage_path,old.file_size,old.transaction_id) then raise exception 'Captured document identity cannot be changed.'; end if;
  if new.label is distinct from old.label then
   insert into public.document_intake_events(account_id,intake_id,actor_id,event,context)
   select account_id,id,auth.uid(),'renamed',jsonb_build_object('before',old.label,'after',new.label) from public.document_intakes where document_id=old.id;
  end if;
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function public.guard_intake_document() from public,anon,authenticated;
create trigger intake_document_guard before update or delete on public.documents for each row execute function public.guard_intake_document();
