import type { ReviewCommand, ReviewRequest, ReviewWorkspace } from './workflowTypes'
let token=''
export async function reviewSession():Promise<{workspaces:{id:string;title:string}[]}> {
 const r=await fetch('/__reconciliation/session',{cache:'no-store'});if(!r.ok)throw new Error('Local review service unavailable.')
 const data=await r.json();token=data.token;return data
}
async function request(id:string,body?:ReviewRequest):Promise<ReviewWorkspace> {
 const r=await fetch(`/__reconciliation/${encodeURIComponent(id)}`,{method:body?'POST':'GET',cache:'no-store',headers:{'x-reconciliation-token':token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})
 const data=await r.json();if(!r.ok)throw new Error(data.error||'Review could not be saved. Your entries are still in the form.');return data
}
export const loadReview=(id:string)=>request(id)
export const saveReview=(id:string,body:ReviewRequest)=>request(id,body)
export function makeRequest(workspace:ReviewWorkspace,command:ReviewCommand):ReviewRequest {return {revision:workspace.state.revision,referenceRevision:workspace.dataset.reference?.revision??null,requestId:crypto.randomUUID(),command}}
export async function reviewDocument(id:string,documentId:string):Promise<Blob> {
 const r=await fetch(`/__reconciliation/${encodeURIComponent(id)}/document?id=${encodeURIComponent(documentId)}`,{headers:{'x-reconciliation-token':token},cache:'no-store'})
 if(!r.ok){const e=await r.json();throw new Error(e.error||'Statement unavailable.')}
 return r.blob()
}
