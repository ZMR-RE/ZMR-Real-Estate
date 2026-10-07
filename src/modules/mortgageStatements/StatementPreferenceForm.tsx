import { useEffect,useRef,useState } from 'react'
import type { StatementDocument,StatementOrganizationStore,StatementPreference,StatementScope } from './statementTypes'
import { statementError } from './organizationLogic'
import { readableDate } from '../mortgageTab/presentationLogic'
export function StatementPreferenceForm({scope,store,onCancel,onSaved,onBusy}:{scope:StatementScope;store:StatementOrganizationStore;onCancel:()=>void;onSaved:()=>void;onBusy?:(busy:boolean)=>void}){
 const [docs,setDocs]=useState<StatementDocument[]>([]),[v,set]=useState<StatementPreference>({referenceId:'',mode:'full',revision:0}),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const lock=useRef(false)
 useEffect(()=>{let alive=true;Promise.all([store.list(scope),store.preference(scope)]).then(([d,p])=>{if(alive){setDocs(d.filter(d=>d.statementDate&&(d.documentKind??'statement')==='statement'));if(p)set(p);setLoading(false)}}).catch(e=>{if(alive){setError(statementError(e));setLoading(false)}});return()=>{alive=false}},[store,scope])
 if(loading)return <p>Loading statement settings…</p>
 return <form onSubmit={async e=>{e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);onBusy?.(true);setError(null);try{await store.savePreference(scope,v);onSaved()}catch(e){setError(statementError(e))}finally{lock.current=false;setBusy(false);onBusy?.(false)}}}><h3 className="property-details-title">Statement settings</h3>
 <label htmlFor="reference-statement">Statement reference<span className="required-marker">*</span></label><select id="reference-statement" required value={v.referenceId} onChange={e=>set({...v,referenceId:e.target.value})}><option value="">Choose a dated statement</option>{docs.map(d=><option key={d.id} value={d.id}>{readableDate(d.statementDate!)} · {d.displayName}</option>)}</select>
 {!docs.length&&<p className="field-hint">Link a statement and confirm its date first.</p>}
 <fieldset><legend>History to track</legend><label><input type="radio" name="history-mode" checked={v.mode==='full'} onChange={()=>set({...v,mode:'full'})}/> Build the full loan history</label><p className="field-hint">Use this statement as a checkpoint and review earlier periods back to the loan’s start.</p><label><input type="radio" name="history-mode" checked={v.mode==='forward'} onChange={()=>set({...v,mode:'forward'})}/> Start from this statement</label><p className="field-hint">Review this period and future statements. Earlier history can be added later.</p></fieldset>
 <p className="field-hint">This choice does not replace a recorded balance or enter payments. Change balances separately in Loan details.</p>
 {error&&<p role="alert">{error}</p>}<div className="statement-actions"><button type="submit" disabled={busy||!v.referenceId}>{busy?'Saving…':'Save'}</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></div></form>
}
