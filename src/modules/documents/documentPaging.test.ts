import { expect, it, vi } from 'vitest'
const state=vi.hoisted(()=>({calls:[] as unknown[][],pages:[] as Array<{data:unknown[]|null;error:{message:string}|null}>}))
vi.mock('../../shared/supabaseClient',()=>({supabase:{from:()=>{const q:Record<string,unknown>={};for(const m of ['select','eq','order','range'])q[m]=(...a:unknown[])=>{state.calls.push([m,...a]);return q};q.returns=async()=>state.pages.shift();return q}}}))
import { listDocuments } from './documentsQueries'
it('reads every service page with account/property scoping and deterministic ordering',async()=>{
 state.calls=[];state.pages=[{data:Array.from({length:100},(_,id)=>({id})),error:null},{data:[{id:100}],error:null}]
 const result=await listDocuments('account-a','property-a')
 expect(result.data).toHaveLength(101)
 expect(state.calls.filter(c=>c[0]==='range')).toEqual([['range',0,99],['range',100,199]])
 expect(state.calls.filter(c=>c[0]==='eq')).toEqual([['eq','account_id','account-a'],['eq','property_id','property-a'],['eq','account_id','account-a'],['eq','property_id','property-a']])
 expect(state.calls).toContainEqual(['order','id',{ascending:true}])
})
it('refuses a partial list when a later page fails',async()=>{
 state.pages=[{data:Array.from({length:100},(_,id)=>({id})),error:null},{data:null,error:{message:'Connection failed'}}]
 expect(await listDocuments('a','p')).toEqual({data:null,error:{message:'Connection failed'}})
})
