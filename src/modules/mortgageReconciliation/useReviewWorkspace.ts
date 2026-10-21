import { useCallback,useEffect,useRef,useState } from 'react'
import { loadReview,makeRequest,reviewSession,saveReview } from './reconciliationRepository'
import type { ReviewStore } from './reviewStore'
import type { ReviewCommand,ReviewRequest,ReviewWorkspace } from './workflowTypes'
export function useReviewWorkspace(store?:ReviewStore){
 const [choices,setChoices]=useState<{id:string;title:string}[]>([]),[id,changeId]=useState('example-v2'),[workspace,setWorkspace]=useState<ReviewWorkspace|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const lock=useRef(false),pending=useRef<ReviewRequest|null>(null),generation=useRef(0)
 useEffect(()=>{let active=true;(store?Promise.resolve({workspaces:[{id:'signed-in-loan',title:'Loan'}]}):reviewSession()).then(r=>{if(active)setChoices(r.workspaces)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[store])
 const refresh=useCallback(async()=>{if(!choices.length)return;const g=++generation.current;try{const w=await (store?store.load():loadReview(id));if(g===generation.current){setWorkspace(w);setError('');pending.current=null}}catch(e){if(g===generation.current)setError((e as Error).message)}},[id,choices.length,store])
 useEffect(()=>{
  if(!choices.length)return
  let active=true;const g=++generation.current;
  (store?store.load():loadReview(id)).then(w=>{if(active&&g===generation.current){setWorkspace(w);setError('');pending.current=null}}).catch(e=>{if(active)setError(e.message)})
  return()=>{active=false}
 },[id,choices.length,store])
 const setId=(value:string)=>{generation.current++;setWorkspace(null);pending.current=null;changeId(value)}
 const save=async(command:ReviewCommand)=>{
  if(lock.current||!workspace)return false;lock.current=true;setBusy(true);setError('')
  try{
   if(!pending.current||JSON.stringify(pending.current.command)!==JSON.stringify(command))pending.current=makeRequest(workspace,command)
   setWorkspace(await (store?store.save(workspace,command,pending.current.requestId):saveReview(id,pending.current)));pending.current=null;return true
  }catch(e){setError((e as Error).message);return false}finally{lock.current=false;setBusy(false)}
 }
 return {choices,id,setId,workspace,error,busy,save,refresh}
}
