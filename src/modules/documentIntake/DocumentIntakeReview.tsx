import { useState } from 'react'
import { formatDateOnly } from '../../shared/dateFormat'
import { DocumentDetailsFields } from './DocumentDetailsFields'
import { intakeDetailsOf, type IntakeDetails, type IntakeRecord } from './documentIntake'
export function DocumentIntakeReview({row,busy,error,onSave,onCancel,onView}:{
 row:IntakeRecord;busy:boolean;error:string
 onSave:(details:IntakeDetails,file:boolean)=>void;onCancel:()=>void;onView:()=>void
}){
 const [details,setDetails]=useState(()=>intakeDetailsOf(row)),[nested,setNested]=useState(false)
 if(row.status==='filed')return <section className="inline-form document-intake-review"><h3>{row.title||row.filename}</h3>
  <dl className="document-intake-summary"><div><dt>Status</dt><dd>Filed</dd></div><div><dt>Category</dt><dd>{row.category}</dd></div>
   <div className="document-intake-wide"><dt>Original filename</dt><dd>{row.filename}</dd></div>
   {row.propertyId&&<div><dt>Property</dt><dd>{row.propertyLabel??'Open property for details'}</dd></div>}
   <div><dt>Applies to</dt><dd>{row.unitId?(row.unitLabel??'Selected unit'):'Whole property'}</dd></div>
   {row.vendorId&&<div><dt>From</dt><dd>{row.vendorLabel??'Selected vendor'}</dd></div>}
   {row.documentDate&&<div><dt>Document date</dt><dd>{formatDateOnly(row.documentDate)}</dd></div>}
   {row.dueDate&&<div><dt>Due date</dt><dd>{formatDateOnly(row.dueDate)}</dd></div>}
   {row.responsibility&&<div><dt>Responsibility</dt><dd>{row.responsibility[0].toUpperCase()+row.responsibility.slice(1)}</dd></div>}
   {row.notes&&<div className="document-intake-wide"><dt>Notes</dt><dd>{row.notes}</dd></div>}
  </dl><div className="form-actions"><button type="button" onClick={onView}>Download original</button><button type="button" onClick={onCancel}>Close</button></div>
 </section>
 return <section className="inline-form document-intake-review"><h3>Review document</h3><p>{row.filename}</p>
  <button type="button" disabled={busy} onClick={onView}>Download original</button>
  {error&&<p role="alert">{error}</p>}
  <fieldset disabled={busy}><DocumentDetailsFields accountId={row.accountId} value={details} onChange={setDetails} onNestedFormChange={setNested}/></fieldset>
  <p className="field-hint">Filing saves the document to this property. It does not record a payment or expense.</p>
  {!nested&&<div className="form-actions"><button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
   <button type="button" disabled={busy} onClick={()=>onSave(details,false)}>Save for later</button>
   <button type="button" disabled={busy||!details.propertyId||!details.category} onClick={()=>onSave(details,true)}>{busy?'Saving…':'File & finish review'}</button>
  </div>}
 </section>
}
