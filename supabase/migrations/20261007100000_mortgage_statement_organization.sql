-- LOCAL CANDIDATE ONLY. Applying this migration to a hosted database needs separate approval.
-- Statement metadata points to the existing canonical documents row.
create table public.mortgage_statement_uploads (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.accounts(id),
 property_id uuid not null references public.properties(id),
 mortgage_id uuid not null references public.mortgage_details(id),
 digest text not null check (digest ~ '^[0-9a-f]{64}$'),
 original_filename text not null check (length(original_filename) between 1 and 255),
 display_name text not null check (length(btrim(display_name)) between 1 and 255),
 statement_date date,
 file_size bigint not null check (file_size between 1 and 26214400),
 storage_path text not null unique,
 document_id uuid unique references public.documents(id) on delete restrict,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(account_id,property_id,digest)
);
create table public.mortgage_statement_requests (
 account_id uuid not null references public.accounts(id),
 request_id uuid not null,
 upload_id uuid not null references public.mortgage_statement_uploads(id),
 payload jsonb not null,
 primary key(account_id,request_id)
);
create table public.mortgage_statement_events (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.accounts(id),
 upload_id uuid not null references public.mortgage_statement_uploads(id),
 actor_id uuid not null references auth.users(id),
 event text not null check(event in ('reserved','finalized','renamed','linked','metadata_updated')),
 context jsonb not null default '{}'::jsonb,
 recorded_at timestamptz not null default now()
);
alter table public.mortgage_statement_uploads enable row level security;
alter table public.mortgage_statement_requests enable row level security;
alter table public.mortgage_statement_events enable row level security;
create policy statement_upload_read on public.mortgage_statement_uploads for select to authenticated using(public.is_account_member(account_id));
create policy statement_event_read on public.mortgage_statement_events for select to authenticated using(public.is_account_member(account_id));
revoke all on public.mortgage_statement_uploads,public.mortgage_statement_requests,public.mortgage_statement_events from public,anon,authenticated;
grant select on public.mortgage_statement_uploads,public.mortgage_statement_events to authenticated;

create function public.reserve_mortgage_statement(
 p_account uuid,p_property uuid,p_mortgage uuid,p_request uuid,p_digest text,
 p_original text,p_name text,p_date date,p_size bigint
) returns public.mortgage_statement_uploads language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare r public.mortgage_statement_uploads; prior public.mortgage_statement_requests; body jsonb; new_id uuid;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501'; end if;
 -- Serializes identity checks and same-loan reservations without trusting supplied IDs.
 perform 1 from public.mortgage_details l join public.properties p on p.id=l.property_id
 where l.id=p_mortgage and l.property_id=p_property and l.account_id=p_account and p.account_id=p_account for update of p;
 if not found then raise exception 'Loan and property do not match this account.' using errcode='42501'; end if;
 if p_request is null or p_digest is null or p_original is null or p_name is null or p_size is null then raise exception 'Upload information is incomplete.'; end if;
 body=jsonb_build_object('property',p_property,'loan',p_mortgage,'digest',p_digest,'original',p_original,'name',p_name,'date',p_date,'size',p_size);
 -- Account/request lock also covers attempts reusing an ID on a different loan.
 perform pg_advisory_xact_lock(hashtextextended(p_account::text||p_request::text,0));
 select * into prior from public.mortgage_statement_requests where account_id=p_account and request_id=p_request;
 if found then
  if prior.payload is distinct from body then raise exception 'This upload request changed. Refresh and review before retrying.' using errcode='22023'; end if;
  select * into r from public.mortgage_statement_uploads where id=prior.upload_id; return r;
 end if;
 select * into r from public.mortgage_statement_uploads where account_id=p_account and property_id=p_property and digest=p_digest;
 if found then
  if r.mortgage_id<>p_mortgage then raise exception 'This file is linked to another loan. Open its existing document and review the loan.'; end if;
  if r.file_size<>p_size then raise exception 'File fingerprint and size disagree.' using errcode='22023'; end if;
 else
  new_id=gen_random_uuid();
  insert into public.mortgage_statement_uploads(id,account_id,property_id,mortgage_id,digest,original_filename,display_name,statement_date,file_size,storage_path,created_by)
  values(new_id,p_account,p_property,p_mortgage,p_digest,p_original,p_name,p_date,p_size,
    p_account::text||'/'||p_property::text||'/Mortgage Documents/statements/'||new_id::text||'.pdf',auth.uid()) returning * into r;
  insert into public.mortgage_statement_events(account_id,upload_id,actor_id,event) values(p_account,r.id,auth.uid(),'reserved');
 end if;
 insert into public.mortgage_statement_requests values(p_account,p_request,r.id,body);
 return r;
end $$;
revoke all on function public.reserve_mortgage_statement(uuid,uuid,uuid,uuid,text,text,text,date,bigint) from public,anon;
grant execute on function public.reserve_mortgage_statement(uuid,uuid,uuid,uuid,text,text,text,date,bigint) to authenticated;

create function public.finalize_mortgage_statement(p_account uuid,p_upload uuid)
returns public.mortgage_statement_uploads language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare r public.mortgage_statement_uploads; d uuid;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501'; end if;
 select * into r from public.mortgage_statement_uploads where id=p_upload and account_id=p_account for update;
 if not found then raise exception 'Upload not found.' using errcode='42501'; end if;
 if r.document_id is not null then return r; end if;
 if not exists(select 1 from public.mortgage_details l join public.properties p on p.id=l.property_id where l.id=r.mortgage_id and l.account_id=p_account and l.property_id=r.property_id and p.account_id=p_account) then raise exception 'Loan relationship changed.'; end if;
 if not exists(select 1 from storage.objects where bucket_id='documents' and name=r.storage_path) then raise exception 'The file is not stored yet. Retry the upload.'; end if;
 insert into public.documents(account_id,property_id,mortgage_id,category,label,storage_path,file_size,uploaded_by)
 values(p_account,r.property_id,r.mortgage_id,'Mortgage Documents',r.display_name,r.storage_path,r.file_size,auth.uid()) returning id into d;
 update public.mortgage_statement_uploads set document_id=d where id=r.id returning * into r;
 insert into public.mortgage_statement_events(account_id,upload_id,actor_id,event) values(p_account,r.id,auth.uid(),'finalized');
 return r;
end $$;
revoke all on function public.finalize_mortgage_statement(uuid,uuid) from public,anon;
grant execute on function public.finalize_mortgage_statement(uuid,uuid) to authenticated;

-- Protect canonical identity from older clients; permit label-only rename so the
-- existing Documents display remains authoritative. Original filename remains metadata.
create function public.guard_statement_document() returns trigger language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
begin
 if exists(select 1 from public.mortgage_statement_uploads where document_id=old.id) then
  if tg_op='DELETE' then raise exception 'This statement is retained as loan evidence.' using errcode='23514'; end if;
  if new.label is null or length(btrim(new.label)) not between 1 and 255 then raise exception 'Enter a statement display name.'; end if;
  if (to_jsonb(new)-'label'-'mortgage_id') is distinct from (to_jsonb(old)-'label'-'mortgage_id') or not exists(select 1 from public.mortgage_statement_uploads s where s.document_id=old.id and s.mortgage_id=new.mortgage_id) then raise exception 'Statement file and loan identity cannot be changed.' using errcode='23514'; end if;
  if new.label is distinct from old.label then
   insert into public.mortgage_statement_events(account_id,upload_id,actor_id,event,context)
   select account_id,id,auth.uid(),'renamed',jsonb_build_object('before',old.label,'after',new.label)
   from public.mortgage_statement_uploads where document_id=old.id;
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function public.guard_statement_document() from public,anon,authenticated;
create trigger statement_document_guard before update or delete on public.documents for each row execute function public.guard_statement_document();

-- Additional restrictive policy leaves normal document operations unchanged.
-- Prevents replacing/deleting reserved originals through a legacy storage client.
create function public.statement_original_locked(p_path text) returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select exists(select 1 from public.mortgage_statement_uploads where storage_path=p_path)
$$;
revoke all on function public.statement_original_locked(text) from public,anon;
grant execute on function public.statement_original_locked(text) to authenticated;
create policy statement_original_no_update on storage.objects as restrictive for update to authenticated
 using(bucket_id <> 'documents' or not public.statement_original_locked(name))
 with check(bucket_id <> 'documents' or not public.statement_original_locked(name));
create policy statement_original_no_delete on storage.objects as restrictive for delete to authenticated
 using(bucket_id <> 'documents' or not public.statement_original_locked(name));

-- Statement organization, local candidate. No existing data is backfilled.
alter table public.mortgage_statement_uploads
 add column source text not null default 'upload' check(source in ('upload','existing')),
 add column period_start date,
 add column period_end date,
 add column document_kind text not null default 'statement' check(document_kind in ('statement','escrow_analysis','tax_statement')),
 add column revision integer not null default 1,
 add check ((period_start is null and period_end is null) or
            (period_start is not null and period_end is not null and period_start<=period_end));

create function public.link_mortgage_statement(p_account uuid,p_property uuid,p_mortgage uuid,p_document uuid,p_digest text)
returns public.mortgage_statement_uploads language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare d public.documents; r public.mortgage_statement_uploads;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501'; end if;
 perform 1 from public.properties p join public.mortgage_details m on m.property_id=p.id
 where p.id=p_property and p.account_id=p_account and m.id=p_mortgage and m.account_id=p_account for update of p;
 if not found then raise exception 'Loan and property do not match this account.' using errcode='42501'; end if;
 select * into d from public.documents where id=p_document and account_id=p_account and property_id=p_property for update;
 if not found or d.storage_path is null or d.link_url is not null then raise exception 'Choose an existing file for this property.'; end if;
 if d.mortgage_id is not null and d.mortgage_id<>p_mortgage then raise exception 'This document is linked to another loan. Review its details first.'; end if;
 if not exists(select 1 from storage.objects where bucket_id='documents' and name=d.storage_path) then raise exception 'Original file is unavailable.'; end if;
 select * into r from public.mortgage_statement_uploads where document_id=d.id;
 if found then
  if r.mortgage_id<>p_mortgage then raise exception 'This document is linked to another loan.'; end if;
  return r;
 end if;
 if exists(select 1 from public.mortgage_statement_uploads where account_id=p_account and property_id=p_property and digest=p_digest) then raise exception 'An identical file is already linked. Open the existing statement; both original documents have been retained.'; end if;
 insert into public.mortgage_statement_uploads(account_id,property_id,mortgage_id,digest,original_filename,display_name,file_size,storage_path,document_id,created_by,source)
 values(p_account,p_property,p_mortgage,p_digest,reverse(split_part(reverse(d.storage_path),'/',1)),coalesce(nullif(btrim(d.label),''),reverse(split_part(reverse(d.storage_path),'/',1))),d.file_size,d.storage_path,d.id,auth.uid(),'existing') returning * into r;
 update public.documents set mortgage_id=p_mortgage,label=r.display_name where id=d.id;
 insert into public.mortgage_statement_events(account_id,upload_id,actor_id,event,context) values(p_account,r.id,auth.uid(),'linked',jsonb_build_object('document_id',d.id));
 return r;
end $$;
revoke all on function public.link_mortgage_statement(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.link_mortgage_statement(uuid,uuid,uuid,uuid,text) to authenticated;

create table public.mortgage_statement_preferences (
 mortgage_id uuid primary key references public.mortgage_details(id),
 account_id uuid not null references public.accounts(id),
 property_id uuid not null references public.properties(id),
 reference_document_id uuid not null references public.documents(id),
 history_mode text not null check(history_mode in ('full','forward')),
 revision integer not null default 1,
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
create table public.mortgage_statement_preference_events (
 id uuid primary key default gen_random_uuid(),account_id uuid not null references public.accounts(id),
 mortgage_id uuid not null references public.mortgage_details(id),actor_id uuid not null references auth.users(id),
 before_value jsonb,after_value jsonb not null,recorded_at timestamptz not null default now()
);
alter table public.mortgage_statement_preferences enable row level security;
alter table public.mortgage_statement_preference_events enable row level security;
create policy statement_preferences_read on public.mortgage_statement_preferences for select to authenticated using(public.is_account_member(account_id));
create policy statement_preferences_events_read on public.mortgage_statement_preference_events for select to authenticated using(public.is_account_member(account_id));
revoke all on public.mortgage_statement_preferences,public.mortgage_statement_preference_events from public,anon,authenticated;
grant select on public.mortgage_statement_preferences,public.mortgage_statement_preference_events to authenticated;

create function public.update_mortgage_statement(p_account uuid,p_property uuid,p_mortgage uuid,p_document uuid,p_revision integer,p_old_label text,p_label text,p_date date,p_start date,p_end date,p_kind text,p_new_mortgage uuid)
returns public.mortgage_statement_uploads language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.mortgage_statement_uploads; before_row jsonb; d public.documents;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501'; end if;
 perform 1 from public.properties where id=p_property and account_id=p_account for update;
 if not found then raise exception 'Property unavailable.' using errcode='42501'; end if;
 select * into r from public.mortgage_statement_uploads where document_id=p_document and account_id=p_account and property_id=p_property and mortgage_id=p_mortgage for update;
 if not found or r.revision is distinct from p_revision then raise exception 'This statement changed. Your entries are kept; cancel and reopen Edit.' using errcode='40001'; end if;
 select * into d from public.documents where id=p_document for update;
 if d.label is distinct from p_old_label then raise exception 'The document label changed. Your entries are kept; cancel and reopen Edit.' using errcode='40001'; end if;
 if not exists(select 1 from public.mortgage_details where id=p_new_mortgage and account_id=p_account and property_id=p_property) then raise exception 'Choose a loan from this property.' using errcode='42501'; end if;
 if exists(select 1 from public.mortgage_statement_preferences where reference_document_id=p_document) and (r.statement_date is distinct from p_date or r.mortgage_id<>p_new_mortgage or p_kind<>'statement' or r.period_start is distinct from p_start or r.period_end is distinct from p_end) then raise exception 'This is a reference statement. Choose another reference in Edit loan before changing its dates, type or loan.'; end if;
 before_row=to_jsonb(r);
 update public.mortgage_statement_uploads set display_name=btrim(p_label),statement_date=p_date,period_start=p_start,period_end=p_end,document_kind=p_kind,mortgage_id=p_new_mortgage,revision=revision+1 where id=r.id returning * into r;
 update public.documents set label=btrim(p_label),mortgage_id=p_new_mortgage where id=p_document;
 insert into public.mortgage_statement_events(account_id,upload_id,actor_id,event,context) values(p_account,r.id,auth.uid(),'metadata_updated',jsonb_build_object('before',before_row,'after',to_jsonb(r)));
 return r;
end $$;
revoke all on function public.update_mortgage_statement(uuid,uuid,uuid,uuid,integer,text,text,date,date,date,text,uuid) from public,anon;
grant execute on function public.update_mortgage_statement(uuid,uuid,uuid,uuid,integer,text,text,date,date,date,text,uuid) to authenticated;

create function public.save_mortgage_statement_preferences(p_account uuid,p_property uuid,p_mortgage uuid,p_reference uuid,p_mode text,p_revision integer)
returns public.mortgage_statement_preferences language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare prior public.mortgage_statement_preferences; r public.mortgage_statement_preferences;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501'; end if;
 perform 1 from public.properties p join public.mortgage_details m on m.property_id=p.id where p.id=p_property and p.account_id=p_account and m.id=p_mortgage and m.account_id=p_account for update of p;
 if not found then raise exception 'Loan unavailable.' using errcode='42501'; end if;
 if not exists(select 1 from public.mortgage_statement_uploads where account_id=p_account and property_id=p_property and mortgage_id=p_mortgage and document_id=p_reference and statement_date is not null and document_kind='statement') then raise exception 'Choose a dated statement linked to this loan.'; end if;
 select * into prior from public.mortgage_statement_preferences where mortgage_id=p_mortgage;
 if coalesce(prior.revision,0) is distinct from p_revision then raise exception 'Statement settings changed. Cancel and reopen Edit to review them.' using errcode='40001'; end if;
 insert into public.mortgage_statement_preferences(mortgage_id,account_id,property_id,reference_document_id,history_mode,updated_by)
 values(p_mortgage,p_account,p_property,p_reference,p_mode,auth.uid()) on conflict(mortgage_id) do update set reference_document_id=excluded.reference_document_id,history_mode=excluded.history_mode,revision=mortgage_statement_preferences.revision+1,updated_by=auth.uid(),updated_at=now() returning * into r;
 insert into public.mortgage_statement_preference_events(account_id,mortgage_id,actor_id,before_value,after_value) values(p_account,p_mortgage,auth.uid(),case when prior.mortgage_id is null then null else to_jsonb(prior) end,to_jsonb(r));
 return r;
end $$;
revoke all on function public.save_mortgage_statement_preferences(uuid,uuid,uuid,uuid,text,integer) from public,anon;
grant execute on function public.save_mortgage_statement_preferences(uuid,uuid,uuid,uuid,text,integer) to authenticated;
