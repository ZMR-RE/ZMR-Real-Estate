import { useRef,useState } from 'react'
import type { LoanChoice, StatementDocument, StatementMetadata } from './statementTypes'
import { statementError,validateMetadata } from './organizationLogic'
export function StatementMetadataForm({document,loans,onSave,onCancel}:{document:StatementDocument;loans:LoanChoice[];onSave:(v:StatementMetadata)=>Promise<void>;onCancel:()=>void}){
 const [v,set]=useState<StatementMetadata>({displayName:document.displayName,statementDate:document.statementDate,periodStart:document.periodStart??null,periodEnd:document.periodEnd??null,documentKind:document.documentKind??'statement',mortgageId:document.mortgageId})
 const [error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);const lock=useRef(false)
 return <form onSubmit={async e=>{e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError(null);try{validateMetadata(v);await onSave(v)}catch(e){setError(statementError(e))}finally{lock.current=false;setBusy(false)}}}>
 <h3 className="property-details-title">Statement details</h3>
 <label htmlFor="statement-label">Label<span className="required-marker">*</span></label><input id="statement-label" required maxLength={255} value={v.displayName} onChange={e=>set({...v,displayName:e.target.value})}/>
 <label htmlFor="statement-loan">Loan<span className="required-marker">*</span></label><select id="statement-loan" value={v.mortgageId} onChange={e=>set({...v,mortgageId:e.target.value})}>{loans.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select>
 <label htmlFor="statement-kind">Document type</label><select id="statement-kind" value={v.documentKind} onChange={e=>set({...v,documentKind:e.target.value as StatementMetadata['documentKind']})}><option value="statement">Mortgage statement</option><option value="escrow_analysis">Escrow analysis</option><option value="tax_statement">Tax statement</option></select>
 {(['statementDate','periodStart','periodEnd'] as const).map((k,i)=><div key={k}><label htmlFor={k}>{['Statement date','Period begins','Period ends'][i]}</label><input id={k} type="date" value={v[k]??''} onChange={e=>set({...v,[k]:e.target.value||null})}/></div>)}
 <p className="field-hint">Use the printed dates. Leave an unknown period blank.</p><p className="field-hint">{document.source==='existing'?'Stored filename':'Original filename'}: {document.originalFilename}</p>
 {error&&<p role="alert">{error}</p>}<div className="statement-actions"><button type="submit" disabled={busy}>{busy?'Saving…':'Save'}</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></div></form>
}
