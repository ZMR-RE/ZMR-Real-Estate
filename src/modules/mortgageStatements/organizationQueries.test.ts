import {beforeEach,expect,it,vi} from 'vitest'
import {createClient} from '@supabase/supabase-js'
let existing=true, linked=false, wrongScope=false
const calls:{url:string;method:string;body:unknown}[]=[]
const scope={accountId:'a',propertyId:'p',mortgageId:'m'}
const row={id:'u',document_id:'d',account_id:'a',property_id:'p',mortgage_id:'m',original_filename:'original.pdf',display_name:'Original',statement_date:null,created_at:'2026-10-07',digest:'',file_size:16,storage_path:'a/p/original.pdf'}
vi.mock('../../shared/supabaseClient',()=>({supabase:createClient('http://127.0.0.1:9','local-only',{
 auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);calls.push({url,method:init?.method??'GET',body:init?.body?JSON.parse(String(init.body)):null})
  if(url.includes('/storage/'))return new Response('%PDF-1.4\nsample')
  if(url.includes('/rpc/update_'))return Response.json({...row,revision:2})
  if(url.includes('/mortgage_statement_uploads'))return Response.json(linked?[{...row,documents:{label:'Original'}}]:[])
  if(url.includes('/documents'))return Response.json(existing?[{id:'d',storage_path:row.storage_path}]:[])
  return Response.json({...row,account_id:wrongScope?'b':'a'})
 }},
})}))
const {statementOrganizationStore}=await import('./organizationQueries')
async function input(){const file=new File(['%PDF-1.4\nsample'],'original.pdf');return {file,digest:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join(''),requestId:'r',originalFilename:file.name,displayName:'Original',statementDate:null}}
beforeEach(()=>{calls.length=0;existing=true;linked=false;wrongScope=false})
it('refuses a duplicate previously uploaded in Documents before any write',async()=>{
 await expect(statementOrganizationStore.upload(scope,await input())).rejects.toThrow('Link existing')
 expect(calls.every(c=>c.method==='GET')).toBe(true)
 const query=new URL(calls[0].url).searchParams
 expect(query.get('account_id')).toBe('eq.a');expect(query.get('property_id')).toBe('eq.p');expect(query.get('file_size')).toBe('eq.15')
})
it('returns the canonical loan document for an identical linked file',async()=>{
 linked=true;expect((await statementOrganizationStore.upload(scope,await input())).id).toBe('d');expect(calls.every(c=>c.method==='GET')).toBe(true)
})
it('metadata save carries both version and original canonical label',async()=>{
 await statementOrganizationStore.update(scope,{...scope,id:'d',originalFilename:'original.pdf',displayName:'Original',statementDate:null,digest:'',uploadedAt:'',loanStatus:'needs_review',booksStatus:'not_reconciled',revision:4},{displayName:'Changed',statementDate:'2026-09-30',periodStart:null,periodEnd:null,mortgageId:'m',documentKind:'statement'})
 expect(calls[0].body).toMatchObject({p_revision:4,p_old_label:'Original',p_account:'a',p_property:'p',p_mortgage:'m'})
})
