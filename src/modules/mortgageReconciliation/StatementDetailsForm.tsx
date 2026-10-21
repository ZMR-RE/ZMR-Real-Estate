import { useState } from 'react'
import { CurrencyAmountInput } from '../../shared/CurrencyAmountInput'
import type { PreparedStatement } from './reviewStore'
import { validateSource,cents,allocationCheck } from './reconciliationLogic'
import type { StatementDocument } from '../mortgageStatements/statementTypes'
export function StatementDetailsForm({document,ready,busy,onSave,onCancel}:{document:StatementDocument;ready:boolean;busy:boolean;onSave:(input:PreparedStatement)=>Promise<void>;onCancel:()=>void}){
 const [principal,setPrincipal]=useState(''),[escrow,setEscrow]=useState(''),[activity,setActivity]=useState<PreparedStatement['activity']>([]),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('')
 const change=(index:number,key:string,value:string)=>setActivity(rows=>rows.map((r,i)=>i===index?{...r,[key]:value}:r))
 return <form className="reconciliation-source-entry" onSubmit={async e=>{e.preventDefault();setError('');try{
  cents(principal);cents(escrow,true)
  for(const r of activity)validateSource(document,{...document,...r,documentId:document.id,statementDate:document.statementDate!,sourceId:`${document.digest}:${r.line}`})
  if(!confirmed||!ready)throw Error('Compare every page of the statement first.')
  await onSave({principal,escrow,activity})
 }catch(e){setError((e as Error).message)}}}>
 <h3 className="property-details-title">Statement details</h3>
 <div className="field-grid"><label>Closing principal ($) *<CurrencyAmountInput value={principal} required min="0" onValueChange={setPrincipal}/></label><label>Closing escrow ($) *<CurrencyAmountInput value={escrow} required min="-99999999.99" onValueChange={setEscrow}/></label></div>
 {activity.map((r,index)=><fieldset key={r.line}><legend>Activity {index+1}</legend><div className="field-grid">
 <label className="reconciliation-entry-wide">Posted date *<input type="date" required max={document.statementDate??undefined} value={r.postedDate} onChange={e=>change(index,'postedDate',e.target.value)}/></label>
 <label>Type<select value={r.kind} onChange={e=>change(index,'kind',e.target.value)}><option value="payment">Payment</option><option value="principal">Extra principal</option><option value="reversal">Principal reversal</option><option value="escrow_disbursement">Escrow paid out</option></select></label>
 {(['total','principal','interest','escrow','fees'] as const).map(k=><label key={k}>{k[0].toUpperCase()+k.slice(1)} ($) *<CurrencyAmountInput required min={r.kind==='reversal'&&k==='principal'||r.kind==='escrow_disbursement'&&['total','escrow'].includes(k)?'-99999999.99':'0'} value={r[k]} onValueChange={v=>change(index,k,v)}/></label>)}
 <label className="reconciliation-entry-wide">Description<input maxLength={500} value={r.description} onChange={e=>change(index,'description',e.target.value)}/></label></div>{r.total&&['payment','principal'].includes(r.kind)&&<p role="status">{allocationCheck(r).message}</p>}<button type="button" disabled={busy} onClick={()=>setActivity(rows=>rows.filter((_,i)=>i!==index))}>Remove unsaved line</button></fieldset>)}
 <button type="button" disabled={busy||activity.length>=100} onClick={()=>setActivity(rows=>[...rows,{line:Math.max(0,...rows.map(r=>r.line))+1,postedDate:'',kind:'payment',description:'',total:'',principal:'',interest:'',escrow:'',fees:'0.00'}])}>Add activity</button>
 <label><input type="checkbox" checked={confirmed} disabled={!ready} onChange={e=>setConfirmed(e.target.checked)}/> I checked every page and included all activity, including any reversals or escrow payments.</label>
 {!activity.length&&<p className="field-hint">No activity entered. Save only if the statement has no transactions.</p>}
 {error&&<p role="alert">{error}</p>}
 <div className="form-actions"><button type="button" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" disabled={busy||!confirmed||!ready}>{busy?'Saving…':'Save'}</button></div>
 </form>
}
