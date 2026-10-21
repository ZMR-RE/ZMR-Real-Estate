import { useEffect,useState } from 'react'
import { PdfCanvasPreview } from '../../shared/pdf/PdfCanvasPreview'
import { reviewDocument } from './reconciliationRepository'
export function StatementSource({workspaceId,documentId,onReady,open}:{workspaceId:string;documentId:string;onReady:()=>void;open?:(id:string)=>Promise<Blob>}){
 const [file,setFile]=useState<{blob:Blob;url:string}|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 useEffect(()=>{let cancelled=false,url='';(open?open(documentId):reviewDocument(workspaceId,documentId)).then(blob=>{if(cancelled)return;url=URL.createObjectURL(blob);setFile({blob,url});onReady()}).catch(e=>{if(!cancelled)setError(e.message)});return()=>{cancelled=true;if(url)URL.revokeObjectURL(url)}},[workspaceId,documentId,attempt,onReady,open])
 return <section className="reconciliation-source" aria-label="Source statement"><h3 className="property-details-title">Source statement</h3>{error?<div role="alert">{error}<button onClick={()=>{setFile(null);setError('');setAttempt(attempt+1)}}>Try again</button></div>:file?<PdfCanvasPreview pdf={file.blob} label="Source statement" openUrl={file.url} filename="mortgage-statement.pdf"/>:<p role="status">Opening statement…</p>}</section>
}
