import { useId, useRef, useState } from 'react'
import type { DocumentRecord } from './documentsQueries'
import { libraryPage, linkKind, originalName, safeLink, type LibraryKind } from './libraryLogic'
import { DocumentLinkForm } from './DocumentLinkForm'
import { DocumentMetadataForm } from './DocumentMetadataForm'
import type { AddDocumentLinkInput } from './useDocumentLinks'
import './documentLibrary.css'
export interface LibrarySectionProps {
 kind: LibraryKind;documents:DocumentRecord[];onView:(path:string)=>void
 onAdd:(input:AddDocumentLinkInput)=>Promise<void>
 onEdit:(doc:DocumentRecord,label:string,url:string)=>Promise<void>
}
export function DocumentLibrarySection({kind,documents,onView,onAdd,onEdit}:LibrarySectionProps){
 const id=useId(),isLink=kind==='links',title=isLink?'Links':'Documents',box=useRef<HTMLDetailsElement>(null)
 const [query,setQuery]=useState(''),[filter,setFilter]=useState(''),[size,setSize]=useState<25|50>(25),[page,setPage]=useState(1)
 const [adding,setAdding]=useState(false),[editing,setEditing]=useState<DocumentRecord|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null)
 const lock=useRef(false)
 const view=libraryPage(documents,kind,query,filter,page,size)
 const options=isLink?['Google Drive folder','Google Doc','Other link']:[...new Set(documents.filter(d=>d.storage_path).map(d=>d.category))].sort()
 const controls=<div className="document-library-pagination"><span>{view.count?`${(view.page-1)*size+1}–${Math.min(view.page*size,view.count)} of ${view.count}`:'0'} {isLink?'links':'files'}</span><div className="document-library-actions"><button type="button" disabled={view.page===1} onClick={()=>setPage(view.page-1)}>Previous</button><span>Page {view.page} of {view.pages}</span><button type="button" disabled={view.page===view.pages} onClick={()=>setPage(view.page+1)}>Next</button></div></div>
 async function add(input:AddDocumentLinkInput){if(lock.current)return;lock.current=true;setSaving(true);setError(null);try{await onAdd(input);setAdding(false)}catch(e){setError(e instanceof Error?e.message:'Unable to save. Your entries are kept.')}finally{lock.current=false;setSaving(false)}}
 return <details className="collapsible-section document-library" ref={box} open={isLink}>
  <summary><span className="collapsible-section-title">{title}</span><span className="document-library-header"><span className="status-badge status-badge-neutral">{view.total} {isLink?'saved':'files'}</span><button type="button" disabled={adding||!!editing} onClick={e=>{e.preventDefault();e.stopPropagation();if(box.current)box.current.open=true;setAdding(true);setError(null)}}>{isLink?'Add link':'Upload documents'}</button></span></summary>
  <div className="collapsible-section-body">
   {adding&&<><DocumentLinkForm key={kind} kind={isLink?'link':'file'} saving={saving} onSave={add} onCancel={()=>{if(!saving){setAdding(false);setError(null)}}}/>{error&&<p role="alert">{error}</p>}</>}
   {editing&&<DocumentMetadataForm key={editing.id} document={editing} onCancel={()=>setEditing(null)} onSave={async(label,url)=>{await onEdit(editing,label,url);setEditing(null)}}/>}
   <div className="document-library-filters"><label htmlFor={`${id}-search`}>Search {title.toLowerCase()}<input id={`${id}-search`} type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder={isLink?'Name or web address…':'Label or filename…'}/></label><label htmlFor={`${id}-filter`}>{isLink?'Link type':'Category'}<select id={`${id}-filter`} value={filter} onChange={e=>{setFilter(e.target.value);setPage(1)}}><option value="">{isLink?'All types':'All categories'}</option>{options.map(o=><option key={o}>{o}</option>)}</select></label><label htmlFor={`${id}-size`}>Show<select id={`${id}-size`} value={size} onChange={e=>{setSize(Number(e.target.value) as 25|50);setPage(1)}}><option>25</option><option>50</option></select></label><button type="button" disabled={!query&&!filter} onClick={()=>{setQuery('');setFilter('');setPage(1)}}>Clear filters</button></div>
   {controls}
   {!view.rows.length?<p className="empty-state">{query||filter?'No items match these filters.':`No ${isLink?'links':'documents'} yet.`}</p>:<table><thead><tr><th>Label</th><th>{isLink?'Type':'Category'}</th><th>Added</th><th>{isLink?'Web address':'Size'}</th><th>Actions</th></tr></thead><tbody>{view.rows.map(doc=><tr key={doc.id}><td data-label="Label">{doc.label||originalName(doc)||'Untitled document'}</td><td data-label={isLink?'Type':'Category'}>{isLink?linkKind(doc):doc.category}</td><td data-label="Added">{new Date(doc.uploaded_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td><td data-label={isLink?'Web address':'Size'}>{isLink?doc.link_url:doc.file_size===null?'—':`${(doc.file_size/1024).toFixed(1)} KB`}</td><td><div className="document-library-actions">{isLink?(safeLink(doc.link_url??'')?<a href={safeLink(doc.link_url!)!} target="_blank" rel="noopener noreferrer">Open link ↗</a>:<span>Check web address</span>):<button type="button" onClick={()=>onView(doc.storage_path!)}>View</button>}<button type="button" disabled={adding||!!editing} onClick={()=>setEditing(doc)}>Edit</button></div></td></tr>)}</tbody></table>}
   {view.pages>1&&controls}
  </div>
 </details>
}
