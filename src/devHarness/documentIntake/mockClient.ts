import { createClient } from '@supabase/supabase-js'
import type { StoredIntake } from '../../modules/documentIntake/documentIntakeQueries'
const rows=new Map<string,StoredIntake>(),files=new Map<string,Blob>()
export const scenario={failFinish:false}
export const supabase=createClient('http://127.0.0.1:9','fictional-only',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
 const url=new URL(String(input)),method=init?.method??'GET',path=url.pathname
 const body=typeof init?.body==='string'?JSON.parse(init.body):{}
 const error=(message:string)=>Response.json({message,code:'PT409'},{status:409})
 if(path.includes('/rpc/reserve_document_intake')){
  const existing=[...rows.values()].find(r=>r.request_id===body.p_request)
  if(existing)return Response.json(existing)
  const id=crypto.randomUUID(),row:StoredIntake={id,account_id:'fictional-account',request_id:body.p_request,digest:body.p_digest,filename:body.p_filename,file_size:body.p_size,
   storage_path:`fictional-account/capture-intake/${id}`,details:body.p_details,status:'uploading',revision:1,document_id:null,created_at:new Date().toISOString()}
  rows.set(id,row);return Response.json(row)
 }
 if(path.includes('/rpc/finish_document_intake')){
  if(scenario.failFinish){scenario.failFinish=false;return error('Test interruption after upload. Retry save to recover the same file.')}
  const row=rows.get(body.p_intake)!;row.status='needs_review';row.revision=2;return Response.json(row)
 }
 if(path.includes('/rpc/review_document_intake')){
  const row=rows.get(body.p_intake)!
  if(body.p_revision!==row.revision)return error('Document changed. Reopen review.')
  row.details=body.p_details;row.revision++
  if(body.p_file){row.status='filed';row.document_id=crypto.randomUUID();row.documents={label:row.details.title||row.filename,category:row.details.category!,property_id:row.details.propertyId,unit_id:row.details.unitId}}
  return Response.json(row)
 }
 if(path.includes('/storage/')){
  const key=decodeURIComponent(path.slice(path.indexOf('/documents/')+11))
  if(method==='POST'){
   if(files.has(key))return Response.json({statusCode:'409',message:'The resource already exists',error:'Duplicate'},{status:409})
   const form=init?.body as FormData
   const file=[...form.values()].find(value=>value instanceof Blob) as Blob
   if(!file)return error('No file')
   files.set(key,file);return Response.json({Key:key})
  }
  const file=files.get(key);return file?new Response(file):error('File unavailable')
 }
 if(path.endsWith('/document_intakes')){
  const id=url.searchParams.get('id')?.replace('eq.','')
  const result=[...rows.values()].map(row=>({...row,property:row.details.propertyId?{address:'2169 Ash St · test',name:null}:null,vendor:row.details.vendorId?{name:'City of Des Plaines · test'}:null,unit:row.details.unitId?{unit_label:'Unit 1'}:null}));return Response.json(id?result.find(row=>row.id===id):result)
 }
 if(path.endsWith('/properties'))return Response.json([{id:'fictional-property',address:'2169 Ash St · test',name:null}])
 if(path.endsWith('/units'))return Response.json([{id:'fictional-unit',unit_label:'Unit 1'}])
 if(path.endsWith('/pick_list_options'))return Response.json([{id:'cat1',list_name:'document_type',value:'Utilities',active:true},{id:'cat2',list_name:'document_type',value:'Mortgage Documents',active:true}])
 if(path.endsWith('/vendors'))return Response.json([{id:'fictional-vendor',name:'City of Des Plaines · test',archived:false}])
 return error(`Unexpected local request: ${path}`)
}}})
