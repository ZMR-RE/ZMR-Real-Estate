import { useRef, useState } from 'react'
import type { DocumentRecord } from './documentsQueries'
export function DocumentMetadataForm({document,onSave,onCancel}:{document:DocumentRecord;onSave:(label:string,url:string)=>Promise<void>;onCancel:()=>void}) {
 const [label,setLabel]=useState(document.label??'');const [url,setUrl]=useState(document.link_url??'')
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);const lock=useRef(false)
 return <form onSubmit={async e=>{e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError(null);try{await onSave(label,url)}catch(err){setError(err instanceof Error?err.message:'Unable to save. Your entries are kept.');lock.current=false;setBusy(false)}}}>
  <h3>{document.link_url?'Edit link':'Edit document label'}</h3>
  <label htmlFor={`label-${document.id}`}>Label</label><input id={`label-${document.id}`} value={label} onChange={e=>setLabel(e.target.value)} maxLength={255} required disabled={busy}/>
  {document.link_url&&<><label htmlFor={`url-${document.id}`}>Web address</label><input id={`url-${document.id}`} type="url" value={url} onChange={e=>setUrl(e.target.value)} required disabled={busy}/></>}
  {error&&<p role="alert">{error}</p>}
  <div className="document-library-actions"><button disabled={busy} type="submit">{busy?'Saving…':'Save'}</button><button disabled={busy} type="button" onClick={onCancel}>Cancel</button></div>
 </form>
}
