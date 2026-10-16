import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { createDocumentIntake, type IntakeDetails, type IntakeRecord } from './documentIntake'
import { documentIntakeRepository, openIntakeDocument, reviewDocument } from './documentIntakeQueries'

const service=createDocumentIntake(documentIntakeRepository)
export function useDocumentIntake() {
 const {accountId}=useAuth()
 const activeAccount=useRef(accountId)
 useEffect(()=>{activeAccount.current=accountId;return()=>{activeAccount.current=null}},[accountId])
 const lock=useRef(false)
 const [rows,setRows]=useState<IntakeRecord[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true)
 const refresh=useCallback(async()=>{
  const account=accountId
  if(!account)return
  try{const result=await service.list(account);if(activeAccount.current===account){setRows(result);setError('')}}
  catch(e){if(activeAccount.current===account)setError(e instanceof Error?e.message:'Could not load documents.')}
  finally{if(activeAccount.current===account)setLoading(false)}
 },[accountId])
 useEffect(()=>{void Promise.resolve().then(refresh)},[refresh])
 async function run<T>(action:(account:string)=>Promise<T>):Promise<T|undefined>{
  if(lock.current||!accountId)return
  lock.current=true;setBusy(true);setError('');const account=accountId
  try{const result=await action(account);if(activeAccount.current!==account)return;return result}
  catch(e){if(activeAccount.current===account)setError(e instanceof Error?e.message:'Could not save. Your entries are kept.')}
  finally{lock.current=false;setBusy(false)}
 }
 function accept(row:IntakeRecord){setRows(current=>[row,...current.filter(r=>r.id!==row.id)])}
 async function capture(request:string,file:File,details:IntakeDetails){
  const row=await run(account=>service.capture(account,request,file,details));if(row)accept(row);return row
 }
 async function review(row:IntakeRecord,details:IntakeDetails,file:boolean){
  const result=await run(account=>reviewDocument(account,row,details,file));if(result){accept(result);await refresh()}return result
 }
 async function view(row:IntakeRecord){
  const blob=await run(account=>openIntakeDocument(account,row.id));if(!blob)return
  const url=URL.createObjectURL(blob),link=document.createElement('a')
  link.href=url;link.download=row.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000)
 }
 return {accountId,rows,error,busy,loading,refresh,capture,review,view}
}
