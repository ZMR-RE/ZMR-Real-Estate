import { useMemo, useState } from 'react'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { AllocationReview } from './AllocationReview'
import { matchPayment, statementBridge } from './reconciliationLogic'
import { useReconciliationDraft } from './useReconciliationDraft'
import type { BalanceReference, ExistingPayment, LoanScope, SourceActivity, StatementBalance } from './reconciliationTypes'
import './mortgageReconciliation.css'
export function MortgageReconciliation({scope,activity,statements,existing,reference,onOpenDocument}:{scope:LoanScope;activity:SourceActivity[];statements:StatementBalance[];existing:ExistingPayment[];reference:BalanceReference|null;onOpenDocument:(id:string)=>void}) {
 const [statement,setStatement]=useState('all'),[status,setStatus]=useState('all'),[page,setPage]=useState(0),[selected,setSelected]=useState<SourceActivity|null>(null)
 const draft=useReconciliationDraft(scope,existing,reference)
 const entries=useMemo(()=>activity.map(row=>{try{return {row,match:matchPayment(scope,row,existing),error:null}}catch(error){return {row,match:null,error:(error as Error).message}}}),[scope,activity,existing])
 const filtered=entries.filter(({row,match})=>(statement==='all'||row.documentId===statement)&&(status==='all'||match?.status===status)).sort((a,b)=>b.row.postedDate.localeCompare(a.row.postedDate)||b.row.line-a.row.line)
 const visible=filtered.slice(page*5,page*5+5)
 const ordered=[...statements].sort((a,b)=>a.date.localeCompare(b.date))
 const bridges=ordered.slice(1).map((next,index)=>{try {return {date:next.date,...statementBridge(scope,ordered[index],next,activity.filter(row=>row.documentId===next.documentId)),error:null}}catch(error){return {date:next.date,balancesMatch:false,missingMonths:0,principalDifference:'—',escrowDifference:'—',error:(error as Error).message}}})
 return <div className="mortgage-reconciliation">
 <CollapsibleSection title={`Statements & reconciliation · ${statements.length}`} defaultOpen>
 <div className="reconciliation-status"><span>{bridges.length?`${bridges.filter(row=>row.balancesMatch&&!row.missingMonths).length} of ${bridges.length} consecutive statement checks pass`:'A previous statement is needed to check the opening balance.'}</span><strong>Books not reconciled</strong></div>
 <p>{reference?`Reference: ${reference.date} · Principal $${reference.principal} · Escrow $${reference.escrow}`:'No dated balance reference. You can review activity, but preparing historical entries is blocked.'}</p>
 <div className="reconciliation-filters"><div><label htmlFor="reconciliation-statement">Statement</label><select id="reconciliation-statement" value={statement} onChange={e=>{setStatement(e.target.value);setPage(0)}}><option value="all">All statements</option>{[...ordered].reverse().map(row=><option key={row.documentId} value={row.documentId}>{row.date}</option>)}</select></div><div><label htmlFor="reconciliation-status">Show</label><select id="reconciliation-status" value={status} onChange={e=>{setStatus(e.target.value);setPage(0)}}><option value="all">All activity</option><option value="missing">Not recorded</option><option value="matched">Already recorded</option><option value="conflict">Needs comparison</option></select></div></div>
 {draft.error&&<p role="alert">{draft.error}</p>}
 {selected?<AllocationReview key={selected.sourceId} source={selected} onCancel={()=>{setSelected(null);draft.clearError()}} onReview={(row,confirmed)=>{if(draft.save(row,confirmed))setSelected(null)}}/>:<>
 <table className="reconciliation-table"><thead><tr><th>Date</th><th>Activity</th><th>Allocation</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(({row,match,error})=><tr key={row.sourceId}><td data-label="Date">{row.postedDate}</td><td data-label="Activity">{row.kind==='principal'?'Principal-only payment':row.kind==='reversal'?'Lender reversal':row.kind==='escrow_disbursement'?'Escrow disbursement':'Payment'}<small>${row.kind==='reversal'?row.principal:row.total}</small></td><td data-label="Allocation"><span>Principal ${row.principal}<br/>Interest ${row.interest}<br/>Escrow ${row.escrow}</span></td><td data-label="Status">{error||match?.message}{draft.drafts.some(d=>d.sourceId===row.sourceId)&&<small>Included in draft</small>}</td><td><button type="button" onClick={()=>onOpenDocument(row.documentId)}>View statement</button><button type="button" disabled={!!error} onClick={()=>{draft.clearError();setSelected(row)}}>Review</button></td></tr>)}</tbody></table>
 {!filtered.length&&<p>No activity matches these filters.</p>}
 <div className="reconciliation-pager"><span>{filtered.length?`${page*5+1}–${Math.min(page*5+5,filtered.length)} of ${filtered.length} entries`:'0 entries'}</span><div><button disabled={!page} onClick={()=>setPage(page-1)}>Previous</button><button disabled={(page+1)*5>=filtered.length} onClick={()=>setPage(page+1)}>Next</button></div></div>
 </>}
 </CollapsibleSection>
 <CollapsibleSection title="Statement balance checks">{bridges.map(row=><p key={row.date}>{row.date}: {row.error||`Principal difference $${row.principalDifference} · Escrow difference $${row.escrowDifference}${row.missingMonths?` · ${row.missingMonths} missing statement months`:''}`}</p>)}<p>Matching lender balances does not verify bank cash movements or Financials entries.</p></CollapsibleSection>
 <CollapsibleSection title={`Review draft · ${draft.drafts.length}`} defaultOpen={false}>
 <p>Temporary local draft. Nothing has been imported. Current balances stay unchanged.</p>
 {draft.drafts.map(row=><div className="reconciliation-draft-row" key={row.sourceId}><span>{row.source.postedDate} · {row.action==='retain_existing'?`Keep existing entry ${row.existingId}`:row.action==='historical_adjustment'?'Historical adjustment':'Historical payment'}<small>Principal change $0.00 · Escrow change $0.00</small></span><button onClick={()=>draft.remove(row.sourceId)}>Remove from draft</button></div>)}
 {!draft.drafts.length&&<p>No reviewed activity yet.</p>}
 </CollapsibleSection>
 </div>
}
