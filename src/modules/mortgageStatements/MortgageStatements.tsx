import { useEffect,useState } from 'react'
import type { LoanChoice,StatementDocument,StatementScope,StatementOrganizationStore } from './statementTypes'
import { useMortgageStatements } from './useMortgageStatements'
import { StatementList } from './StatementList'
import { StatementUploadForm } from './StatementUploadForm'
import { StatementMetadataForm } from './StatementMetadataForm'
import { ExistingStatementForm } from './ExistingStatementForm'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { statementError } from './organizationLogic'
import './mortgageStatements.css'
export function MortgageStatements({scope,store,lender,suffix,onOpen,onDocuments,loanChoices,onLoanChange}:{scope:StatementScope;store:StatementOrganizationStore;lender:string;suffix:string;onOpen:(id:string)=>void;onDocuments:()=>void;loanChoices?:LoanChoice[];onLoanChange?:(id:string)=>void}){
 const state=useMortgageStatements(scope,store),[mode,setMode]=useState<'upload'|'link'|null>(null),[editing,setEditing]=useState<StatementDocument|null>(null),[loans,setLoans]=useState<LoanChoice[]>([]),[error,setError]=useState<string|null>(null)
 useEffect(()=>{let alive=true;store.loans(scope).then(v=>{if(alive)setLoans(v)}).catch(e=>{if(alive)setError(statementError(e))});return()=>{alive=false}},[scope,store])
 return <CollapsibleSection title={`Statements & reconciliation${state.loading?'':` · ${state.documents.length}`}`} defaultOpen>
 {loanChoices&&loanChoices.length>1&&<><label htmlFor="statements-loan-filter">Statements for</label><select id="statements-loan-filter" value={scope.mortgageId} disabled={!!mode||!!editing||state.busy} onChange={e=>onLoanChange?.(e.target.value)}>{loanChoices.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></>}
 <div className="statement-actions"><button type="button" disabled={!!mode||!!editing} onClick={()=>setMode('link')}>Link existing</button><button type="button" disabled={!!mode||!!editing} onClick={()=>setMode('upload')}>Upload statements</button><button type="button" disabled={!!mode||!!editing} onClick={onDocuments}>View in Documents</button></div>
 {(state.error||error)&&<p role="alert">{state.error||error}</p>}
 {mode==='upload'&&<StatementUploadForm rows={state.rows} busy={state.busy} lender={lender} suffix={suffix} onFiles={state.addFiles} onChange={state.change} onSave={state.save} onOpen={onOpen} onCancel={()=>{state.clear();setMode(null)}}/>}
 {mode==='link'&&<ExistingStatementForm scope={scope} store={store} onCancel={()=>setMode(null)} onDone={async()=>{await state.refresh();setMode(null)}}/>}
 {editing&&<StatementMetadataForm key={editing.id} document={editing} loans={loans} onCancel={()=>setEditing(null)} onSave={async input=>{await store.update(scope,editing,input);setEditing(null);try{await state.refresh()}catch(e){setError(`Saved, but the list could not refresh. ${statementError(e)}`)}}}/>}
 {!mode&&!editing&&(state.loading?<p>Loading statements…</p>:<StatementList documents={state.documents} onOpen={onOpen} onEdit={setEditing}/>)}
 </CollapsibleSection>
}
