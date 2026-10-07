import { supabase } from '../../shared/supabaseClient'
import type { StatementDocument, StatementScope, StatementStore, StatementUpload } from './statementTypes'
import { assertScope } from './statementLogic'
export interface StoredStatement {
 id: string; account_id: string; property_id: string; mortgage_id: string
 digest: string; original_filename: string; display_name: string; statement_date: string | null
 source?: 'upload'|'existing'; period_start?: string|null; period_end?: string|null; document_kind?: 'statement'|'escrow_analysis'|'tax_statement'; revision?:number
 storage_path: string; document_id: string | null; created_at: string; file_size: number
}
export function mapRow(r: StoredStatement, label?: string | null): StatementDocument {
 if(!r.document_id) throw Error('This upload has not been finalized. Retry it before opening.')
 return {id:r.document_id,accountId:r.account_id,propertyId:r.property_id,mortgageId:r.mortgage_id,
 digest:r.digest,originalFilename:r.original_filename,displayName:label ?? r.display_name,statementDate:r.statement_date,
 source:r.source??'upload',periodStart:r.period_start??null,periodEnd:r.period_end??null,documentKind:r.document_kind??'statement',revision:r.revision??1,
 uploadedAt:r.created_at,loanStatus:'needs_review',booksStatus:'not_reconciled'}
}
export async function fingerprint(blob: Blob) {
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('')
}
async function verifyOriginal(row: StoredStatement, input: StatementUpload) {
 const {data,error}=await supabase.storage.from('documents').download(row.storage_path)
 if(error||!data) throw Error('Unable to verify the stored PDF. Retry; no new document will be created.')
 if(data.size!==input.file.size||await fingerprint(data)!==input.digest) throw Error('Stored file differs from the selected PDF. Nothing was finalized; contact support.')
}
// Candidate gateway: never silently treats a missing schema as an empty loan.
// Candidate wiring requires the draft schema; this is not a released feature.
export const mortgageStatementStore: StatementStore = {
 async list(scope) {
  // Explicit pages avoid silently hiding older statements at the API row cap.
  // Order by immutable ID while collecting; the presentation sorts by date.
  const documents: StatementDocument[] = []
  const pageSize = 100
  for (let offset = 0; ; offset += pageSize) {
   const {data,error}=await supabase.from('mortgage_statement_uploads')
    .select('*, documents!document_id(label)').eq('account_id',scope.accountId).eq('property_id',scope.propertyId)
    .eq('mortgage_id',scope.mortgageId).not('document_id','is',null)
    .order('id',{ascending:true}).range(offset, offset + pageSize - 1)
   if(error) throw Error(error.message)
   const rows = data as (StoredStatement & {documents:{label:string|null}|null})[]
   for (const row of rows) {
    const doc=mapRow(row,row.documents?.label);assertScope(doc,scope);documents.push(doc)
   }
   if (rows.length < pageSize) return documents
  }
 },
 async upload(scope: StatementScope,input: StatementUpload) {
  // Recompute bytes: a stale UI digest must never identify a different file.
  if(await fingerprint(input.file)!==input.digest) throw Error('Selected file changed. Choose it again.')
  const {data,error}=await supabase.rpc('reserve_mortgage_statement',{
   p_account:scope.accountId,p_property:scope.propertyId,p_mortgage:scope.mortgageId,p_request:input.requestId,
   p_digest:input.digest,p_original:input.originalFilename,p_name:input.displayName,p_date:input.statementDate,p_size:input.file.size,
  })
  if(error) throw error
  const row=data as StoredStatement
  if(row.account_id!==scope.accountId||row.property_id!==scope.propertyId||row.mortgage_id!==scope.mortgageId) throw Error('Upload scope mismatch.')
  // Never upsert/overwrite originals. An existing object after a lost response
  // is accepted only after downloading and comparing its actual bytes.
  if(!row.document_id) {
   const result=await supabase.storage.from('documents').upload(row.storage_path,input.file,{upsert:false,contentType:'application/pdf'})
   if(result.error) {
    const status=String((result.error as {statusCode?: string}).statusCode)
    if(status!=='409' && !/already exists|duplicate/i.test(result.error.message)) throw result.error
   }
  }
  await verifyOriginal(row,input)
  const finished=await supabase.rpc('finalize_mortgage_statement',{p_account:scope.accountId,p_upload:row.id})
  if(finished.error) throw finished.error
  const document=mapRow(finished.data as StoredStatement);assertScope(document,scope);return document
 },
 async open(scope,id) {
  const {data,error}=await supabase.from('mortgage_statement_uploads').select('*')
   .eq('account_id',scope.accountId).eq('property_id',scope.propertyId).eq('mortgage_id',scope.mortgageId).eq('document_id',id).single()
  if(error) throw error
  const row=data as StoredStatement;assertScope(mapRow(row),scope)
  const file=await supabase.storage.from('documents').download(row.storage_path)
  if(file.error||!file.data) throw file.error??Error('Unable to open statement.')
  if(file.data.size!==Number(row.file_size)||await fingerprint(file.data)!==row.digest) throw Error('Statement verification failed. The file may have changed.')
  return file.data
 },
}
