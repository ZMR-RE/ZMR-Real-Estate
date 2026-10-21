import { useEffect, useState } from 'react'
import { statementAllocation, differsFromStatement } from './statementAllocation'
import { formatDateOnlyShort } from '../../shared/dateFormat'
import { allocationCheck } from './reconciliationLogic'
import type { ReviewCommand,ReviewSource,SavedReview } from './workflowTypes'
export function ReviewAllocationForm({source,review,activity,sourceReady,busy,onSave,onCancel,reviews}:{source:ReviewSource;review?:SavedReview;activity:ReviewSource[];sourceReady:boolean;busy:boolean;onSave:(c:ReviewCommand)=>Promise<boolean>;onCancel:()=>void;reviews:SavedReview[]}){
 const values=statementAllocation(source),replacing=!!review&&differsFromStatement(source,review.allocation)
 const [reason,setReason]=useState(review?.reason??''),[reversalOf,setReversalOf]=useState(review?.reversalOf??''),[confirmed,setConfirmed]=useState(false),[duplicateConfirmed,setDuplicateConfirmed]=useState<number|null>(null)
 const duplicates=reviews.filter(r=>r.sourceId!==source.sourceId&&r.original.postedDate===source.postedDate&&['payment','principal'].includes(source.kind)&&['payment','principal'].includes(r.original.kind)&&Number(r.allocation.total)===Number(values.total))
 const duplicateSources=duplicates.map(r=>r.sourceId).sort().join('|')
 useEffect(()=>setDuplicateConfirmed(null),[duplicateSources])
 const payment=['payment','principal'].includes(source.kind),check=payment?allocationCheck(values):{valid:true,message:'Noncash adjustment — review its original entry.'}
 return <form className="reconciliation-review" onSubmit={async e=>{e.preventDefault();if(await onSave({kind:'review',sourceId:source.sourceId,allocation:{total:values.total,principal:values.principal,interest:values.interest,escrow:values.escrow,fees:values.fees},reason,reversalOf:reversalOf||null,confirmed,duplicateAck:duplicates.length>0?duplicateConfirmed??undefined:undefined}))onCancel()}}>
 <h3 className="property-details-title">Review activity</h3><p>{formatDateOnlyShort(source.postedDate)} · {source.description}</p>
 <p className="field-hint">Use the amounts recorded from the original statement. Check the PDF before saving.</p>
 <dl className="reconciliation-inputs">{(['total','principal','interest','escrow','fees'] as const).map(k=><div key={k}><dt>{k==='total'?'Total payment':k[0].toUpperCase()+k.slice(1)}</dt><dd>{Number(values[k]).toLocaleString('en-US',{style:'currency',currency:'USD'})}</dd></div>)}</dl>
 {replacing&&<p role="status">This saved review differs from the statement amounts. Save replaces its allocation; the earlier review stays in history.</p>}
 <p role="status" className={check.valid?'reconciliation-success':'reconciliation-warning'}>{check.message}</p>
 {source.kind==='reversal'&&<label>Original allocation <span className="required">*</span><select required value={reversalOf} onChange={e=>{setReversalOf(e.target.value);setConfirmed(false)}}><option value="">Choose the original payment</option>{activity.filter(a=>['payment','principal'].includes(a.kind)&&a.postedDate<=source.postedDate).map(a=><option key={a.sourceId} value={a.sourceId}>{formatDateOnlyShort(a.postedDate)} · Principal ${a.principal}</option>)}</select></label>}
 <details><summary>Original statement values</summary><p>Total ${source.total} · Principal ${source.principal} · Interest ${source.interest} · Escrow ${source.escrow} · Fees ${source.fees??'0.00'}</p><p>Statement line {source.line}{source.page?` · Page ${source.page}`:''}</p></details>
 {duplicates.length>0&&<div className="reconciliation-warning"><p>{duplicates.length} other reviewed entry has this date and total.</p><label><input type="checkbox" checked={duplicateConfirmed===duplicates.length} onChange={e=>setDuplicateConfirmed(e.target.checked?duplicates.length:null)}/> I compared both sources; these are separate entries.</label><p className="field-hint">Explain the difference in the review note.</p></div>}
 <label htmlFor="review-reason">Review note / reason for correction</label><textarea id="review-reason" value={reason} maxLength={2000} onChange={e=>setReason(e.target.value)}/>
 <label><input type="checkbox" checked={confirmed} disabled={!sourceReady} onChange={e=>setConfirmed(e.target.checked)}/> I compared this allocation with the statement.</label>
 {!sourceReady&&<p className="field-hint">Open the source statement before confirming.</p>}
 <div className="form-actions"><button type="button" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" disabled={busy||!confirmed||!check.valid||(duplicates.length>0&&duplicateConfirmed!==duplicates.length)}>{busy?'Saving…':'Save'}</button></div>
 </form>
}
