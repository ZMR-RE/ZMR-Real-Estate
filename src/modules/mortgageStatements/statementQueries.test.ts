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
  if(url.includes('/rpc/finalize_'))return failFinalize?Response.json({message:'simulated finalize refusal',code:'P0001'},{status:400}):Response.json({...row,document_id:'D'})
  if(url.includes('/storage/')&&method==='POST')return duplicate?Response.json({message:'The resource already exists',statusCode:'409',error:'Duplicate'},{status:409}):Response.json({Key:'documents/path'})
  if(url.includes('/storage/'))return new Response(corrupt?'different':bytes,{headers:{'content-type':'application/pdf'}})
  const offset=Number(new URL(url).searchParams.get('offset')??0)
  if(failLaterPage && offset>0)return Response.json({message:'later page refused'},{status:403})
  return Response.json(Array.from({length:Math.max(0,Math.min(100,listCount-offset))},(_,i)=>({...row,document_id:`D${offset+i}`,documents:{label:'Canonical renamed label'}})))
 }},auth:{persistSession:false,autoRefreshToken:false},
})}))
const {mortgageStatementStore}=await import('./statementQueries')
const scope={accountId:'A',propertyId:'P',mortgageId:'M'}
async function input(){const file=new File([bytes],'original.pdf',{type:'application/pdf'});const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');row.digest=digest;return {file,digest,requestId:'R',originalFilename:file.name,displayName:'Display',statementDate:'2026-09-04'}}
beforeEach(()=>{sent.length=0;listCount=1;failLaterPage=false;bytes='%PDF-1.4\nfictional';corrupt=false;duplicate=false;failFinalize=false;row={id:'U',account_id:'A',property_id:'P',mortgage_id:'M',digest:'',original_filename:'original.pdf',display_name:'Display',statement_date:'2026-09-04',storage_path:'A/P/Mortgage Documents/U.pdf',document_id:null,created_at:'2026-10-06',file_size:new Blob([bytes]).size}})
it('uses reserve, non-overwriting upload, byte verification then finalize',async()=>{
 expect((await mortgageStatementStore.upload(scope,await input())).id).toBe('D')
 expect(sent.map(r=>r.url.includes('/rpc/')?r.url.split('/').at(-1):r.method)).toEqual(['reserve_mortgage_statement','POST','GET','finalize_mortgage_statement'])
 expect(sent[1].headers.get('x-upsert')).toBe('false')
})
it('recovers an already-uploaded object only after comparing bytes',async()=>{duplicate=true;expect((await mortgageStatementStore.upload(scope,await input())).id).toBe('D')})
it('never finalizes corrupt stored bytes',async()=>{corrupt=true;await expect(mortgageStatementStore.upload(scope,await input())).rejects.toThrow('differs');expect(sent.some(r=>r.url.includes('finalize_'))).toBe(false)})
it('does not report success on finalization refusal',async()=>{failFinalize=true;await expect(mortgageStatementStore.upload(scope,await input())).rejects.toBeTruthy()})
it('refuses a different account response before touching storage',async()=>{const args=await input();row.account_id='B';await expect(mortgageStatementStore.upload(scope,args)).rejects.toThrow('scope');expect(sent).toHaveLength(1)})
it('rejects file/digest mismatch before network',async()=>{const args=await input();args.digest='wrong';await expect(mortgageStatementStore.upload(scope,args)).rejects.toThrow('changed');expect(sent).toHaveLength(0)})
it('lists only this account/property/loan and uses the canonical label',async()=>{const docs=await mortgageStatementStore.list(scope);expect(docs[0].displayName).toBe('Canonical renamed label');expect(sent[0].url).toContain('account_id=eq.A');expect(sent[0].url).toContain('property_id=eq.P');expect(sent[0].url).toContain('mortgage_id=eq.M')})

it('loads older statements beyond the first API page',async()=>{
 listCount=205
 const docs=await mortgageStatementStore.list(scope)
 expect(docs).toHaveLength(205)
 expect(new Set(docs.map(doc=>doc.id)).size).toBe(205)
 expect(sent.map(request=>new URL(request.url).searchParams.get('offset'))).toEqual(['0','100','200'])
})
it('does not show a partial history when a later page fails',async()=>{
 listCount=205;failLaterPage=true
 await expect(mortgageStatementStore.list(scope)).rejects.toThrow('later page refused')
})
