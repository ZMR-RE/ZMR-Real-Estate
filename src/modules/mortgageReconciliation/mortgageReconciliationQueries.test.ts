import {beforeEach,expect,it,vi} from 'vitest'
import {createClient} from '@supabase/supabase-js'
const sent:{url:string;method:string;body:Record<string,unknown>|null}[]=[]
let missing=false,corrupt=false,paymentCount=0,conflict=false
const bytes='%PDF-1.4\nfictional statement'
const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('')
const scope={accountId:'a',propertyId:'p',mortgageId:'m'}
const upload={id:'u',account_id:'a',property_id:'p',mortgage_id:'m',digest,document_id:'d',storage_path:'a/p/statement.pdf',file_size:bytes.length,original_filename:'statement.pdf',display_name:'Statement',statement_date:'2026-09-01',document_kind:'statement',revision:1,created_at:'2026-09-02'}
vi.mock('../../shared/supabaseClient',()=>({supabase:createClient('http://127.0.0.1:9','local-test',{
 auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input:RequestInfo|URL,init?:RequestInit)=>{
 const url=new URL(String(input)),path=url.pathname;sent.push({url:String(url),method:init?.method??'GET',body:init?.body?JSON.parse(String(init.body)):null})
 if(path.includes('/storage/'))return new Response(corrupt?'bad':bytes,{headers:{'content-type':'application/pdf'}})
 if(path.endsWith('save_mortgage_statement_review'))return conflict?Response.json({code:'PT409',message:'Review changed. Refresh; your form entries are retained.'},{status:409}):Response.json({revision:2})
 if(path.endsWith('mortgage_details'))return Response.json({id:'m',lender_name:'Example',current_balance:9000,escrow_balance:50,principal_as_of:null,escrow_as_of:null,principal_version:1,escrow_version:1})
 if(path.endsWith('mortgage_statement_reviews'))return missing?Response.json({message:'review table missing',code:'PGRST205'},{status:404}):Response.json(null)
 if(path.endsWith('mortgage_statement_uploads'))return Response.json(new Headers(init?.headers).get('accept')?.includes('vnd.pgrst.object')?upload:[{...upload,documents:{label:'Canonical label'}}])
 if(path.endsWith('mortgage_payments')){const offset=Number(url.searchParams.get('offset')??0);return Response.json(Array.from({length:Math.max(0,Math.min(100,paymentCount-offset))},(_,i)=>({id:`p${offset+i}`,mortgage_id:'m',payment_date:'2026-08-01',amount:100,principal_amount:70,interest_amount:30,voided:false})))}
 if(path.endsWith('mortgage_balance_review_causes'))return Response.json([])
 if(path.endsWith('mortgage_history_payments'))return Response.json([])
 return Response.json({message:'Unexpected test request'},{status:500})
 }}})}))
const {createMortgageReviewStore}=await import('./mortgageReconciliationQueries')
beforeEach(()=>{sent.length=0;missing=false;corrupt=false;paymentCount=0;conflict=false})
it('scopes every table read to account, property and loan; no schema fallback',async()=>{
 const store=createMortgageReviewStore(scope);await store.load()
 for(const req of sent){expect(req.method).toBe('GET');expect(req.url).toContain('account_id=eq.a');expect(req.url).toContain('property_id=eq.p');expect(req.url).toMatch(/mortgage_id|id=eq.m/)}
 missing=true;await expect(store.load()).rejects.toMatchObject({message:'review table missing'})
})
it('empty reviews remain incomplete and canonical document labels are retained',async()=>{
 const store=createMortgageReviewStore(scope),w=await store.load();expect(w.state.completed).toEqual({});expect(w.dataset.reference).toBeNull();expect(w.state.issues).toHaveLength(1);expect((await store.catalog()).documents[0].displayName).toBe('Canonical label')
})
it('paginates existing payments instead of silently truncating matching evidence',async()=>{
 paymentCount=205;const w=await createMortgageReviewStore(scope).load();expect(w.dataset.existing).toHaveLength(205)
 expect(sent.filter(r=>new URL(r.url).pathname.endsWith('mortgage_payments')).map(r=>new URL(r.url).searchParams.get('offset'))).toEqual(['0','100','200'])
})
it('opens the canonical original without uploading or duplicating it',async()=>{
 const store=createMortgageReviewStore(scope);await store.load();const file=await store.open('d');expect(await file.text()).toBe(bytes)
 expect(sent.filter(r=>r.url.includes('/storage/'))).toHaveLength(1);expect(sent.every(r=>r.method==='GET')).toBe(true)
})
it('corrupt originals cannot unlock saving',async()=>{
 corrupt=true;const store=createMortgageReviewStore(scope),w=await store.load(),doc=(await store.catalog()).documents[0]
 await expect(store.open('d')).rejects.toThrow('verification failed')
 await expect(store.prepare(w,doc,{principal:'9000.00',escrow:'50.00',activity:[]},'r')).rejects.toThrow('Open the original')
 expect(sent.some(r=>r.url.includes('/rpc/'))).toBe(false)
})
it('save goes only through review RPC with versions and original identity; no financial writes',async()=>{
 const store=createMortgageReviewStore(scope),w=await store.load(),doc=(await store.catalog()).documents[0];await store.open('d')
 await store.prepare(w,doc,{principal:'9000.00',escrow:'50.00',activity:[]},'r')
 const writes=sent.filter(r=>r.method==='POST');expect(writes).toHaveLength(1);expect(writes[0].url).toContain('save_mortgage_statement_review');expect(writes[0].body).toMatchObject({p_account:'a',p_property:'p',p_mortgage:'m',p_revision:1,p_request:'r',p_command:{digest,documentId:'d',documentRevision:1,principalVersion:1,escrowVersion:1}})
})

it('surfaces a real SDK conflict without automatic retry; explicit retry keeps request identity',async()=>{
 const store=createMortgageReviewStore(scope),w=await store.load(),doc=(await store.catalog()).documents[0];await store.open('d')
 conflict=true
 await expect(store.prepare(w,doc,{principal:'9000.00',escrow:'50.00',activity:[]},'same-request')).rejects.toMatchObject({code:'PT409'})
 expect(sent.filter(r=>r.method==='POST')).toHaveLength(1)
 conflict=false
 await store.prepare(w,doc,{principal:'9000.00',escrow:'50.00',activity:[]},'same-request')
 expect(sent.filter(r=>r.method==='POST').map(r=>r.body?.p_request)).toEqual(['same-request','same-request'])
})
