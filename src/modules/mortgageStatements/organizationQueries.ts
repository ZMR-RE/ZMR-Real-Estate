import { supabase } from '../../shared/supabaseClient'
import { mortgageStatementStore, mapRow, fingerprint, type StoredStatement } from './statementQueries'
import type { StatementOrganizationStore, StatementScope, StatementPreference } from './statementTypes'
import { assertScope } from './statementLogic'
import { validateMetadata } from './organizationLogic'
interface PreferenceRow {reference_document_id:string;history_mode:'full'|'forward';revision:number}
const preference = (r:PreferenceRow):StatementPreference=>({referenceId:r.reference_document_id,mode:r.history_mode,revision:r.revision})
export const statementOrganizationStore:StatementOrganizationStore={
 ...mortgageStatementStore,
 async upload(scope,input){
  if(await fingerprint(input.file)!==input.digest)throw Error('Selected file changed. Choose it again.')
  // Also check legacy Documents uploads, which have no statement fingerprint yet.
  // Restrict by account/property and byte size; never infer identity from a label.
  for(let offset=0;;offset+=100){
   const {data,error}=await supabase.from('documents').select('id,storage_path').eq('account_id',scope.accountId).eq('property_id',scope.propertyId).eq('file_size',input.file.size).not('storage_path','is',null).order('id').range(offset,offset+99)
   if(error)throw error
   for(const existing of data??[]){
    const file=await supabase.storage.from('documents').download(existing.storage_path!)
    if(file.error||!file.data)throw Error('An existing file could not be checked for duplicates. Try again before uploading.')
    if(await fingerprint(file.data)===input.digest){
     const linked=(await mortgageStatementStore.list(scope)).find(d=>d.id===existing.id)
     if(linked)return linked
     throw Error('This exact file is already saved in property Documents. Cancel this upload and use Link existing; no second copy was uploaded.')
    }
   }
   if(!data||data.length<100)break
  }
  return mortgageStatementStore.upload(scope,input)
 },
 async loans(scope){
  const {data,error}=await supabase.from('mortgage_details').select('id,lender_name,loan_number,voided').eq('account_id',scope.accountId).eq('property_id',scope.propertyId).order('id')
  if(error)throw error
  return (data??[]).map(r=>({id:r.id,label:`${r.lender_name||'Lender not recorded'}${r.loan_number?' •'+r.loan_number.slice(-4):''}${r.voided?' · Closed':''}`}))
 },
 async existing(scope){
  const result=[]
  for(let offset=0;;offset+=100){
   const {data,error}=await supabase.from('documents').select('id,label,storage_path,mortgage_id').eq('account_id',scope.accountId).eq('property_id',scope.propertyId).not('storage_path','is',null).order('id').range(offset,offset+99)
   if(error)throw error
   result.push(...(data??[]).map(r=>({id:r.id,label:r.label||'Unnamed document',storagePath:r.storage_path!,mortgageId:r.mortgage_id})))
   if(!data||data.length<100)return result
  }
 },
 async link(scope,file){
  const {data,error}=await supabase.storage.from('documents').download(file.storagePath)
  if(error||!data)throw error??Error('Unable to open original.')
  if(new TextDecoder().decode((await data.arrayBuffer()).slice(0,5))!=='%PDF-')throw Error('Choose an original PDF statement.')
  const linked=await supabase.rpc('link_mortgage_statement',{p_account:scope.accountId,p_property:scope.propertyId,p_mortgage:scope.mortgageId,p_document:file.id,p_digest:await fingerprint(data)})
  if(linked.error)throw linked.error
  const doc=mapRow(linked.data as StoredStatement);assertScope(doc,scope);return doc
 },
 async update(scope,original,input){
  validateMetadata(input)
  const {data,error}=await supabase.rpc('update_mortgage_statement',{
   p_account:scope.accountId,p_property:scope.propertyId,p_mortgage:scope.mortgageId,p_document:original.id,
   p_revision:original.revision??1,p_old_label:original.displayName,p_label:input.displayName.trim(),p_date:input.statementDate,
   p_start:input.periodStart,p_end:input.periodEnd,p_kind:input.documentKind,p_new_mortgage:input.mortgageId,
  })
  if(error)throw error
  const doc=mapRow(data as StoredStatement);assertScope(doc,{...scope,mortgageId:input.mortgageId});return doc
 },
 async preference(scope){
  const {data,error}=await supabase.from('mortgage_statement_preferences').select('reference_document_id,history_mode,revision').eq('account_id',scope.accountId).eq('property_id',scope.propertyId).eq('mortgage_id',scope.mortgageId).maybeSingle()
  if(error)throw error
  return data?preference(data as PreferenceRow):null
 },
 async savePreference(scope:StatementScope,input){
  const {data,error}=await supabase.rpc('save_mortgage_statement_preferences',{p_account:scope.accountId,p_property:scope.propertyId,p_mortgage:scope.mortgageId,p_reference:input.referenceId,p_mode:input.mode,p_revision:input.revision})
  if(error)throw error
  return preference(data as PreferenceRow)
 },
}
