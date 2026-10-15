-- Application conflicts are deliberate HTTP 409 refusals, not retryable
-- serialization failures. Preserve the already-applied original migration.
-- Only these two functions change; no stored rows or balances are modified.
create or replace function public.update_mortgage_statement(p_account uuid,p_property uuid,p_mortgage uuid,p_document uuid,p_revision integer,p_old_label text,p_label text,p_date date,p_start date,p_end date,p_kind text,p_new_mortgage uuid)
returns public.mortgage_statement_uploads language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.mortgage_statement_uploads; before_row jsonb; d public.documents;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501'; end if;
 perform 1 from public.properties where id=p_property and account_id=p_account for update;
 if not found then raise exception 'Property unavailable.' using errcode='42501'; end if;
 select * into r from public.mortgage_statement_uploads where document_id=p_document and account_id=p_account and property_id=p_property and mortgage_id=p_mortgage for update;
 if not found or r.revision is distinct from p_revision then raise exception 'This statement changed. Your entries are kept; cancel and reopen Edit.' using errcode='PT409'; end if;
 select * into d from public.documents where id=p_document for update;
 if d.label is distinct from p_old_label then raise exception 'The document label changed. Your entries are kept; cancel and reopen Edit.' using errcode='PT409'; end if;
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

create or replace function public.save_mortgage_statement_preferences(p_account uuid,p_property uuid,p_mortgage uuid,p_reference uuid,p_mode text,p_revision integer)
returns public.mortgage_statement_preferences language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare prior public.mortgage_statement_preferences; r public.mortgage_statement_preferences;
begin
 if auth.uid() is null or not public.is_account_member(p_account) then raise exception 'Not authorized.' using errcode='42501'; end if;
 perform 1 from public.properties p join public.mortgage_details m on m.property_id=p.id where p.id=p_property and p.account_id=p_account and m.id=p_mortgage and m.account_id=p_account for update of p;
 if not found then raise exception 'Loan unavailable.' using errcode='42501'; end if;
 if not exists(select 1 from public.mortgage_statement_uploads where account_id=p_account and property_id=p_property and mortgage_id=p_mortgage and document_id=p_reference and statement_date is not null and document_kind='statement') then raise exception 'Choose a dated statement linked to this loan.'; end if;
 select * into prior from public.mortgage_statement_preferences where mortgage_id=p_mortgage;
 if coalesce(prior.revision,0) is distinct from p_revision then raise exception 'Statement settings changed. Cancel and reopen Edit to review them.' using errcode='PT409'; end if;
 insert into public.mortgage_statement_preferences(mortgage_id,account_id,property_id,reference_document_id,history_mode,updated_by)
 values(p_mortgage,p_account,p_property,p_reference,p_mode,auth.uid()) on conflict(mortgage_id) do update set reference_document_id=excluded.reference_document_id,history_mode=excluded.history_mode,revision=mortgage_statement_preferences.revision+1,updated_by=auth.uid(),updated_at=now() returning * into r;
 insert into public.mortgage_statement_preference_events(account_id,mortgage_id,actor_id,before_value,after_value) values(p_account,p_mortgage,auth.uid(),case when prior.mortgage_id is null then null else to_jsonb(prior) end,to_jsonb(r));
 return r;
end $$;
revoke all on function public.save_mortgage_statement_preferences(uuid,uuid,uuid,uuid,text,integer) from public,anon;
grant execute on function public.save_mortgage_statement_preferences(uuid,uuid,uuid,uuid,text,integer) to authenticated;
