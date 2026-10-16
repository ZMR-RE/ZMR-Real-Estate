import { useRef, useState } from 'react'
import { DocumentDetailsFields } from './DocumentDetailsFields'
import { emptyIntakeDetails, intakeDetailsOf, type IntakeDetails, type IntakeRecord } from './documentIntake'

export function DocumentIntakeForm({accountId,busy,error,resume,onSave,onCancel}:{
 accountId:string;busy:boolean;error:string;resume?:IntakeRecord
 onSave:(requestId:string,file:File,details:IntakeDetails)=>Promise<IntakeRecord|undefined>;onCancel:()=>void
}){
 const [details,setDetails]=useState<IntakeDetails>(resume?intakeDetailsOf(resume):emptyIntakeDetails)
 const [file,setFile]=useState<File|null>(null),[attempted,setAttempted]=useState(false),[nested,setNested]=useState(false)
 const request=useRef(resume?.requestId??crypto.randomUUID()),frozen=useRef<IntakeDetails|null>(null)
 async function submit(){if(!file||busy)return;frozen.current??={...details};setAttempted(true);await onSave(request.current,file,frozen.current)}
 return <form className="capture-form document-intake-review" onSubmit={e=>{e.preventDefault();void submit()}}>
  <h2>Add document</h2><p>Save the file now. Add details when you review it.</p>
  {error&&<p role="alert">{error}</p>}
  {resume&&<p>Choose the original file, {resume.filename}, to finish this upload.</p>}
  <fieldset disabled={busy}>
   <label htmlFor="document-intake-file">File<span className="required-marker">*</span></label>
   <input id="document-intake-file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={e=>setFile(e.target.files?.[0]??null)}/>
   <p className="field-hint">PDF or image · up to 25 MB</p>
   <details><summary>Add details · optional</summary><fieldset disabled={attempted||!!resume}>
    <DocumentDetailsFields accountId={accountId} value={details} onChange={setDetails} onNestedFormChange={setNested}/>
   </fieldset></details>
  </fieldset>
  {attempted&&error&&<p>Your original capture details are kept for retry. You can edit them after the upload finishes.</p>}
  {!nested&&<div className="form-actions"><button type="button" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" disabled={busy||!file}>{busy?'Saving…':attempted?'Retry save':'Save'}</button></div>}
 </form>
}
