import './documentIntake.css'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentIntake } from './useDocumentIntake'
import { DocumentIntakeForm } from './DocumentIntakeForm'
import { DocumentIntakeReview } from './DocumentIntakeReview'
import type { IntakeRecord } from './documentIntake'

export function DocumentIntakePanel({capture=false,onCaptured,onCancel,propertyId=null,pendingOnly=false}:{
 capture?:boolean;onCaptured?:()=>void;onCancel?:()=>void;propertyId?:string|null;pendingOnly?:boolean
}){
 const intake=useDocumentIntake()
 const [selected,setSelected]=useState<IntakeRecord|null>(null),[resume,setResume]=useState<IntakeRecord|null>(null)
 const [query,setQuery]=useState(''),[status,setStatus]=useState(pendingOnly?'needs_review':'all'),[page,setPage]=useState(1),[size,setSize]=useState(25)
 const filtered=useMemo(()=>intake.rows.filter(row=>(!propertyId||row.propertyId===propertyId)&&
  (status==='all'||(status==='needs_review'?row.status!=='filed':row.status===status))&&
  `${row.title} ${row.filename} ${row.category??''} ${row.notes}`.toLowerCase().includes(query.toLowerCase())),[intake.rows,propertyId,status,query])
 const pages=Math.max(1,Math.ceil(filtered.length/size)),currentPage=Math.min(page,pages),shown=filtered.slice((currentPage-1)*size,currentPage*size)
 if(!intake.accountId)return <p>Select an account to capture documents.</p>
 if(capture||resume)return <DocumentIntakeForm key={resume?.id??'new'} accountId={intake.accountId} busy={intake.busy} error={intake.error} resume={resume??undefined}
  onSave={async(request,file,details)=>{const row=await intake.capture(request,file,details);if(row){setResume(null);onCaptured?.()}return row}}
  onCancel={()=>{setResume(null);onCancel?.()}}/>
 return <section aria-label="Captured documents">
  <div className="page-header-row"><h2>Documents</h2><button type="button" disabled={intake.busy} onClick={()=>void intake.refresh()}>Refresh</button></div>
  <div className="field-grid"><label>Search documents<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label>
   <label>Status<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);setSelected(null)}}><option value="needs_review">Needs review</option><option value="filed">Filed</option><option value="all">All documents</option></select></label>
   <label>Show<select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}><option value={25}>25</option><option value={50}>50</option></select></label>
  </div>
  {intake.error&&!selected&&<p role="alert">{intake.error}</p>}
  <div className={selected?'document-intake-split':''}><div>{intake.loading?<p>Loading documents…</p>:<>
   <div className="table-scroll"><table className="document-intake-table"><thead><tr><th>Document</th><th>Status</th><th>Actions</th></tr></thead><tbody>{shown.map(row=><tr key={row.id}>
    <td>{row.title||row.filename}</td><td>{row.status==='filed'?'Filed':row.status==='uploading'?'Upload unfinished':'Needs review'}</td>
    <td>{row.status==='filed'&&row.propertyId?<><Link to={`/properties/${row.propertyId}`}>Open property</Link><button type="button" onClick={()=>setSelected(row)}>Details</button></>:<button type="button" disabled={intake.busy} onClick={()=>row.status==='uploading'?setResume(row):setSelected(row)}>{row.status==='uploading'?'Resume upload':'Review'}</button>}
    {row.status!=='uploading'&&<button type="button" disabled={intake.busy} onClick={()=>void intake.view(row)}>Download original</button>}</td>
   </tr>)}</tbody></table></div>
   {!shown.length&&!intake.error&&<p>No documents to show.</p>}
   <div className="form-actions"><span>{filtered.length} documents · Page {currentPage} of {pages}</span><button type="button" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Previous</button><button type="button" disabled={currentPage>=pages} onClick={()=>setPage(currentPage+1)}>Next</button></div>
  </>}</div>
  {selected&&<DocumentIntakeReview key={`${selected.id}:${selected.revision}`} row={selected} busy={intake.busy} error={intake.error}
   onCancel={()=>setSelected(null)} onView={()=>void intake.view(selected)} onSave={(details,file)=>{void intake.review(selected,details,file).then(row=>{if(row)setSelected(null)})}}/>}
 </div></section>
}
