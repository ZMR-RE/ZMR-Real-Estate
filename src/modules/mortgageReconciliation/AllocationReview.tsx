import { useState } from 'react'
import { CurrencyAmountInput } from '../../shared/CurrencyAmountInput'
import { allocationCheck, dollars, cents } from './reconciliationLogic'
import type { SourceActivity } from './reconciliationTypes'
export function AllocationReview({ source, onCancel, onReview }: { source: SourceActivity; onCancel: () => void; onReview: (row: SourceActivity, confirmed: boolean) => void }) {
  const [values, setValues] = useState(source), [confirmed, setConfirmed] = useState(false)
  const payment = source.kind === 'payment' || source.kind === 'principal'
  const allocation = payment ? allocationCheck(values) : {valid:true,message:'Adjustment only · not a new cash payment'}
  return <form className="reconciliation-review" onSubmit={event => {event.preventDefault(); if(allocation.valid) onReview(values, confirmed)}}>
    <h3>Review statement activity</h3><p>Posted {source.postedDate} · Statement {source.statementDate}</p>
    {payment ? <div className="reconciliation-inputs">{(['total','principal','interest','escrow'] as const).map(key => <div key={key}><label htmlFor={`review-${key}`}>{key === 'total' ? 'Total payment' : key[0].toUpperCase()+key.slice(1)} ($)</label><CurrencyAmountInput id={`review-${key}`} value={values[key]} onValueChange={value => {setValues({...values,[key]:value});setConfirmed(false)}} required min={key==='total'?'0.01':'0'} max="99999999.99"/></div>)}</div> : <p>{source.kind === 'reversal' ? `Lender reversal: principal allocation $${dollars(cents(source.principal,true))}. Review its link to the original allocation.` : `Escrow disbursement: $${source.total}. Preserve the lender’s historical escrow balance, including a negative balance.`}</p>}
    <p role="status" className={allocation.valid?'reconciliation-success':'reconciliation-warning'}>{allocation.message}</p>
    <label className="reconciliation-confirm"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/> I compared these details with the source statement.</label>
    <div className="form-actions"><button type="button" onClick={onCancel}>Cancel</button><button type="submit" disabled={!confirmed||!allocation.valid}>Save draft</button></div>
  </form>
}
