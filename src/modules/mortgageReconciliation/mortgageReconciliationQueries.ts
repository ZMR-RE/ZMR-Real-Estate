import { boundedReviewRequest } from './reviewRequest'
import { matchPayment } from './reconciliationLogic'
import { supabase } from '../../shared/supabaseClient'
import { mortgageStatementStore } from '../mortgageStatements/statementQueries'
import type { StatementDocument } from '../mortgageStatements/statementTypes'
import type { LoanScope,ExistingPayment,StatementBalance } from './reconciliationTypes'
import type { ReviewCommand,ReviewSource,ReviewWorkspace,ReviewState,ReviewIssue } from './workflowTypes'
import type { PreparedStatement,ReviewStore } from './reviewStore'
interface Snapshot extends StatementBalance {documentRevision:number;digest:string;activity:ReviewSource[]}
interface StoredReview {revision:number;statements:Record<string,Snapshot>;reviews:ReviewState['reviews'];completed:ReviewState['completed']}
interface Loan {id:string;lender_name:string;current_balance:number;escrow_balance:number|null;principal_as_of:string|null;escrow_as_of:string|null;principal_version:number;escrow_version:number}
export interface ReviewCatalog {documents:StatementDocument[];prepared:Record<string,Snapshot>}
export function createMortgageReviewStore(scope:LoanScope):ReviewStore & {catalog():Promise<ReviewCatalog>;restart(w:ReviewWorkspace,doc:StatementDocument,note:string,requestId:string):Promise<ReviewWorkspace>;prepare(w:ReviewWorkspace,doc:StatementDocument,input:PreparedStatement,requestId:string):Promise<ReviewWorkspace>} {
 // Per mounted account/loan instance, never a shared cross-account cache.
 let documents:StatementDocument[]=[],prepared:Record<string,Snapshot>={},loan:Loan|null=null
 const opened=new Set<string>()
 async function read() {
  const [{data:l,error:le},{data:r,error:re},docs]=await Promise.all([
   supabase.from('mortgage_details').select('id,lender_name,current_balance,escrow_balance,principal_as_of,escrow_as_of,principal_version,escrow_version').eq('account_id',scope.accountId).eq('property_id',scope.propertyId).eq('id',scope.mortgageId).single(),
   supabase.from('mortgage_statement_reviews').select('revision,statements,reviews,completed').eq('account_id',scope.accountId).eq('property_id',scope.propertyId).eq('mortgage_id',scope.mortgageId).maybeSingle(),
   mortgageStatementStore.list(scope),
  ])
  if(le)throw le;if(re)throw re // Missing schema is an error, never empty success.
  loan=l as Loan;documents=docs;const stored=r as StoredReview|null;prepared=stored?.statements??{}
  const existing:ExistingPayment[]=[]
  for(const table of ['mortgage_payments','mortgage_history_payments'])for(let offset=0;;offset+=100){
   const {data,error}=await supabase.from(table).select('id,mortgage_id,payment_date,amount,principal_amount,interest_amount,voided').eq('account_id',scope.accountId).eq('property_id',scope.propertyId).or(`mortgage_id.eq.${scope.mortgageId},mortgage_id.is.null`).order('id').range(offset,offset+99)
   if(error)throw error
   for(const p of data??[])existing.push({...scope,id:p.id,mortgageId:p.mortgage_id,postedDate:p.payment_date,total:String(p.amount),principal:String(p.principal_amount),interest:String(p.interest_amount),escrow:'0.00',fees:'0.00',voided:p.voided})
   if(!data||data.length<100)break
  }
  const issues:ReviewIssue[]=docs.filter(d=>d.documentKind==='statement'&&(!prepared[d.id]||prepared[d.id].date!==d.statementDate||prepared[d.id].digest!==d.digest)).map(d=>({id:d.id,message:`${d.displayName}: statement details need review.`,locked:true,category:'statement_details' as const}))
  for(let offset=0;;offset+=100){
   const {data,error}=await supabase.from('mortgage_balance_review_causes').select('id,balance_kind').eq('account_id',scope.accountId).eq('property_id',scope.propertyId).eq('review_mortgage_id',scope.mortgageId).is('resolved_at',null).order('id').range(offset,offset+99)
   if(error)throw error
   for(const cause of data??[])issues.push({id:`balance:${cause.id}`,message:`Resolve the ${cause.balance_kind} balance review in the Action Queue first.`,locked:true})
   if(!data||data.length<100)break
  }
  const referenceStatement=Object.values(prepared).find(s=>s.date===loan!.principal_as_of)
  const reference=referenceStatement&&loan.principal_as_of===loan.escrow_as_of?{date:referenceStatement.date,principal:referenceStatement.principal,escrow:referenceStatement.escrow,revision:loan.principal_version}:null
  const workspace:ReviewWorkspace={referenceVersions:{principal:loan.principal_version,escrow:loan.escrow_version},dataset:{id:scope.mortgageId,title:loan.lender_name,scope,reference,activity:Object.values(prepared).flatMap(s=>s.activity),statements:Object.values(prepared),existing,issues},state:{revision:stored?.revision??1,reviews:stored?.reviews??{},completed:Object.fromEntries(Object.entries(stored?.completed??{}).map(([id,c])=>{const doc=docs.find(d=>d.id===id);const versions=c as typeof c & {principalVersion?:number;escrowVersion?:number};const changedMatch=Object.values(stored?.reviews??{}).filter(r=>r.original.documentId===id).some(r=>{try{const m=matchPayment(scope,{...r.original,...r.allocation},existing);return m.status==='conflict'||(m.existingId??null)!==(r.existingId??null)}catch{return true}});return [id,{...c,stale:changedMatch||issues.some(i=>i.id===id||i.id.startsWith('balance:'))||!doc||prepared[id]?.date!==doc.statementDate||prepared[id]?.digest!==doc.digest||versions.principalVersion!==loan!.principal_version||versions.escrowVersion!==loan!.escrow_version}]})),issues,nextCycles:[]}}
  return workspace
 }
 async function send(w:ReviewWorkspace,doc:StatementDocument,command:Record<string,unknown>,requestId:string){
  if(!opened.has(doc.id))throw Error('Open the original statement before saving.')
  const {error}=await boundedReviewRequest(signal=>supabase.rpc('save_mortgage_statement_review',{p_account:scope.accountId,p_property:scope.propertyId,p_mortgage:scope.mortgageId,p_revision:w.state.revision,p_request:requestId,p_command:{...command,documentId:doc.id,digest:doc.digest,documentRevision:doc.revision,confirmed:true,principalVersion:w.referenceVersions?.principal,escrowVersion:w.referenceVersions?.escrow}}).abortSignal(signal).retry(false))
  if(error)throw error
  return boundedReviewRequest(()=>read())
 }
 return {
  load:read,
  async catalog(){return {documents,prepared}},
  async open(id){const file=await mortgageStatementStore.open(scope,id);opened.add(id);return file},
  async restart(w,doc,note,requestId){return send(w,doc,{kind:'restart',note},requestId)},
  async prepare(w,doc,input,requestId){return send(w,doc,{kind:'prepare',statement:input},requestId)},
  async save(w,command:ReviewCommand,requestId){
   if(command.kind==='issue')throw Error('Resolve this issue using its statement details.')
   const id='documentId' in command?command.documentId:w.dataset.activity.find(a=>a.sourceId===command.sourceId)?.documentId
   const doc=documents.find(d=>d.id===id);if(!doc)throw Error('Statement not found in this loan.')
   return send(w,doc,command,requestId)
  },
 }
}

/** Same saved outcome in the statement list; uploading or renaming never asserts reconciliation. */
export async function listReviewedStatements(scope:LoanScope):Promise<StatementDocument[]> {
 const store=createMortgageReviewStore(scope),w=await store.load(),catalog=await store.catalog()
 return catalog.documents.map(doc=>({...doc,loanStatus:w.state.completed[doc.id]?(w.state.completed[doc.id].stale?'needs_recheck':'reconciled'):'needs_review'}))
}
