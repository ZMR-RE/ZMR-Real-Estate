import { useCallback,useEffect,useMemo,useRef,useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { createMortgageReviewStore,type ReviewCatalog } from './mortgageReconciliationQueries'
import { ReconciliationWorkspace } from './ReconciliationWorkspace'
import { StatementDetailsForm } from './StatementDetailsForm'
import { StatementSource } from './StatementSource'
import type { ReviewWorkspace } from './workflowTypes'
import type { PreparedStatement } from './reviewStore'
export function LoanReconciliation({propertyId,mortgageId,onEditing}:{propertyId:string;mortgageId:string;onEditing:(editing:boolean)=>void}){
 const {accountId}=useAuth()
 if(!accountId)return <p role="alert">Sign in to review statements.</p>
 return <SignedInReview key={`${accountId}/${propertyId}/${mortgageId}`} onEditing={onEditing} accountId={accountId} propertyId={propertyId} mortgageId={mortgageId}/>
}
function SignedInReview({accountId,propertyId,mortgageId,onEditing}:{accountId:string;propertyId:string;mortgageId:string;onEditing:(editing:boolean)=>void}){
 const store=useMemo(()=>createMortgageReviewStore({accountId,propertyId,mortgageId}),[accountId,propertyId,mortgageId])
 const [catalog,setCatalog]=useState<ReviewCatalog|null>(null),[workspace,setWorkspace]=useState<ReviewWorkspace|null>(null),[selected,setSelected]=useState(''),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0),[restartNote,setRestartNote]=useState(''),[workspaceEditing,setWorkspaceEditing]=useState(false)
 const reportEditing=useCallback((value:boolean)=>{setWorkspaceEditing(value);onEditing(value)},[onEditing])
 const lock=useRef(false),pending=useRef<{body:string;id:string}|null>(null)
 const onReady=useCallback(()=>setReady(true),[])
 useEffect(()=>{let active=true;store.load().then(async w=>{const c=await store.catalog();if(active){setWorkspace(w);setCatalog(c);setError('')}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[store,reload])
 const doc=catalog?.documents.find(d=>d.id===selected)
 async function prepare(input:PreparedStatement){
  if(lock.current||!doc||!workspace)return;lock.current=true;setBusy(true)
  try{const body=JSON.stringify({id:doc.id,input,revision:workspace.state.revision});if(pending.current?.body!==body)pending.current={body,id:crypto.randomUUID()}
   await store.prepare(workspace,doc,input,pending.current.id);pending.current=null;setSelected('');onEditing(false);setReady(false);setReload(x=>x+1)
  }finally{lock.current=false;setBusy(false)}
 }
 async function restart(){
  if(!workspace||!doc||lock.current)return;lock.current=true;setBusy(true);setError('')
  try{const body=JSON.stringify({kind:'restart',id:doc.id,note:restartNote,revision:workspace.state.revision});if(pending.current?.body!==body)pending.current={body,id:crypto.randomUUID()}
   await store.restart(workspace,doc,restartNote,pending.current.id);pending.current=null;setSelected('');onEditing(false);setReload(x=>x+1)
  }catch(e){setError((e as Error).message)}finally{lock.current=false;setBusy(false)}
 }
 if(error&&!catalog)return <div role="alert">{error}<button onClick={()=>setReload(x=>x+1)}>Try again</button></div>
 if(!catalog)return <p role="status">Loading statement reviews…</p>
 const missing=catalog.documents.filter(d=>d.documentKind==='statement')
 return <div className="mortgage-reconciliation">{error&&<p role="alert">{error}</p>}
 {missing.length>0&&!doc&&<div className="statement-actions"><label>Statement details<select value="" disabled={workspaceEditing||busy} onChange={e=>{setSelected(e.target.value);setRestartNote('');onEditing(!!e.target.value);setReady(false);pending.current=null}}><option value="">Choose a statement</option>{missing.map(d=><option key={d.id} value={d.id} disabled={!d.statementDate}>{d.displayName}{catalog.prepared[d.id]?' · Recorded':''}{!d.statementDate?' · add date first':''}</option>)}</select></label></div>}
 {doc?<div className="reconciliation-workspace has-source">{catalog.prepared[doc.id]?<form onSubmit={async e=>{e.preventDefault();await restart()}}><h3 className="property-details-title">Recorded statement details</h3><p>Restart only to correct the original statement details. This statement’s saved reviews and this and later period outcomes will return to review. The audit history and original PDF are kept.</p><label>Reason<textarea required maxLength={2000} value={restartNote} onChange={e=>setRestartNote(e.target.value)}/></label><div className="form-actions"><button type="button" disabled={busy} onClick={()=>{setSelected('');onEditing(false)}}>Cancel</button><button type="submit" disabled={!ready||busy||!restartNote.trim()}>Restart details</button></div></form>:<StatementDetailsForm key={`details:${doc.id}`} document={doc} ready={ready} busy={busy} onSave={prepare} onCancel={()=>{setSelected('');onEditing(false);setReady(false)}}/>}<StatementSource key={`source:${doc.id}`} workspaceId={mortgageId} documentId={doc.id} open={store.open} onReady={onReady}/></div>:<ReconciliationWorkspace key={reload} store={store} onEditing={reportEditing} onWorkspaceChange={setWorkspace}/>}
 </div>
}
