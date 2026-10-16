import { beforeEach, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
const sent:{url:string;method:string;headers:Headers}[]=[]
let bytes='%PDF-1.4\nfictional', corrupt=false, duplicate=false, failFinalize=false
let listCount=1, failLaterPage=false
let row:Record<string,unknown>
vi.mock('../../shared/supabaseClient',()=>({supabase:createClient('http://127.0.0.1:9','local-only',{
 global:{fetch:async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input),method=init?.method??'GET';sent.push({url,method,headers:new Headers(init?.headers)})
  if(url.includes('/rpc/reserve_'))return Response.json(row)
  if(url.includes('/rpc/finish_'))return failFinalize?Response.json({message:'simulated finalize refusal',code:'P0001'},{status:400}):Response.json({...row,status:'needs_review',revision:2})
  if(url.includes('/object/sign/'))return Response.json({signedURL:'/object/sign/documents/A/capture-intake/U?token=test'})
  if(url.includes('/storage/')&&method==='POST')return duplicate?Response.json({message:'The resource already exists',statusCode:'409',error:'Duplicate'},{status:409}):Response.json({Key:'documents/path'})
  if(url.includes('/storage/'))return new Response(corrupt?'different':bytes,{headers:{'content-type':'application/pdf'}})
  if(new Headers(init?.headers).get('accept')?.includes('object'))return Response.json(row)
  const offset=Number(new URL(url).searchParams.get('offset')??0)
  if(failLaterPage && offset>0)return Response.json({message:'later page refused'},{status:403})
  return Response.json(Array.from({length:Math.max(0,Math.min(100,listCount-offset))},(_,i)=>({...row,document_id:`D${offset+i}`,documents:{label:'Canonical renamed label'}})))
 }},auth:{persistSession:false,autoRefreshToken:false},
})}))
const {documentIntakeRepository,mapIntake,prepareIntakeDownload}=await import('./documentIntakeQueries')
const details={title:'',propertyId:null,unitId:null,category:null,documentDate:null,notes:''}
function input(){return new File([bytes],'bill.pdf',{type:'application/pdf'})}
beforeEach(()=>{sent.length=0;listCount=1;failLaterPage=false;bytes='%PDF-1.4\nfictional';corrupt=false;duplicate=false;failFinalize=false;row={id:'U',account_id:'A',request_id:'R',digest:'',filename:'bill.pdf',storage_path:'A/capture-intake/U',document_id:null,created_at:'2026-10-16',file_size:new Blob([bytes]).size,details,status:'uploading',revision:1}})
it('reserves, uploads without overwrite, verifies bytes, then finishes',async()=>{
 expect((await documentIntakeRepository.capture('A','R',input(),details)).status).toBe('needs_review')
 expect(sent.map(r=>r.url.includes('/rpc/')?r.url.split('/').at(-1):r.method)).toEqual(['reserve_document_intake','POST','GET','finish_document_intake'])
 expect(sent[1].headers.get('x-upsert')).toBe('false')
})
it('recovers existing upload only when its bytes match',async()=>{duplicate=true;expect((await documentIntakeRepository.capture('A','R',input(),details)).id).toBe('U')})
it('never finalizes corrupt stored bytes',async()=>{corrupt=true;await expect(documentIntakeRepository.capture('A','R',input(),details)).rejects.toThrow('does not match');expect(sent.some(r=>r.url.includes('finish_'))).toBe(false)})
it('does not report success on finish refusal',async()=>{failFinalize=true;await expect(documentIntakeRepository.capture('A','R',input(),details)).rejects.toThrow('simulated')})
it('refuses another account before storage access',async()=>{row.account_id='B';await expect(documentIntakeRepository.capture('A','R',input(),details)).rejects.toThrow('mismatch');expect(sent).toHaveLength(1)})
it('refuses a path outside the account intake namespace',async()=>{row.storage_path='B/capture-intake/U';await expect(documentIntakeRepository.capture('A','R',input(),details)).rejects.toThrow('mismatch')})
it('lists every page and uses canonical document labels',async()=>{listCount=205;const docs=await documentIntakeRepository.list('A');expect(docs).toHaveLength(205);expect(docs[0].title).toBe('Canonical renamed label');expect(sent.every(r=>r.url.includes('account_id=eq.A'))).toBe(true)})
it('does not hide a failed later page',async()=>{listCount=205;failLaterPage=true;await expect(documentIntakeRepository.list('A')).rejects.toThrow('later page refused')})
it('keeps original filename distinct from a renamed canonical label',()=>{const result=mapIntake({...row,documents:{label:'New label',category:'Utilities',property_id:'P',unit_id:null}} as Parameters<typeof mapIntake>[0]);expect(result.filename).toBe('bill.pdf');expect(result.title).toBe('New label')})
it('never calls a financial write endpoint',async()=>{await documentIntakeRepository.capture('A','R',input(),details);expect(sent.every(r=>/document_intake|storage/.test(r.url))).toBe(true)})

it('creates a short-lived original download only after verifying the scoped file',async()=>{
 row.digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bytes)))).map(b=>b.toString(16).padStart(2,'0')).join('')
 const result=await prepareIntakeDownload('A','U')
 expect(result.filename).toBe('bill.pdf')
 expect(result.url).toContain('download=bill.pdf')
 expect(sent.map(r=>r.method)).toEqual(['GET','GET','POST'])
 expect(sent[0].url).toContain('account_id=eq.A')
})
it('does not issue a download link for corrupt bytes',async()=>{
 row.digest='0'.repeat(64)
 await expect(prepareIntakeDownload('A','U')).rejects.toThrow('does not match')
 expect(sent.some(r=>r.url.includes('/object/sign/'))).toBe(false)
})
