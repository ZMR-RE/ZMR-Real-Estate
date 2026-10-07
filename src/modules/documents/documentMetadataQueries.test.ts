import { beforeEach, expect, it, vi } from 'vitest'
const mock=vi.hoisted(()=>({calls:[] as unknown[][], result:{data:[{id:'doc'}] as unknown[]|null,error:null as {message:string}|null}}))
vi.mock('../../shared/supabaseClient',()=>({supabase:{from:(...args:unknown[])=>{mock.calls.push(['from',...args]);const q:Record<string,unknown>={};for(const method of ['update','eq','is','select'])q[method]=(...a:unknown[])=>{mock.calls.push([method,...a]);return q};q.returns=async()=>mock.result;return q}}}))
import { updateDocumentMetadata } from './documentMetadataQueries'
import type { DocumentRecord } from './documentsQueries'
const original:DocumentRecord={id:'doc',property_id:'property',transaction_id:null,category:'Mortgage',label:'Old label',storage_path:'account/property/original.pdf',file_size:999,uploaded_at:'2026-01-01',link_url:null,link_type:null}
beforeEach(()=>{mock.calls=[];mock.result={data:[{...original,label:'New label'}],error:null}})
it('changes only label, scoped to the account and property, comparing original metadata',async()=>{
 await updateDocumentMetadata('account','property',original,'New label','')
 expect(mock.calls).toContainEqual(['update',{label:'New label'}])
 for(const pair of [['account_id','account'],['property_id','property'],['id','doc'],['label','Old label'],['storage_path',original.storage_path]]) expect(mock.calls).toContainEqual(['eq',...pair])
 expect(mock.calls).toContainEqual(['is','link_url',null])
})
it('refuses concurrent changes and denied rows instead of claiming saved',async()=>{
 mock.result.data=[]
 await expect(updateDocumentMetadata('account','property',original,'New label','')).rejects.toThrow('changed or is no longer available')
})
it('keeps storage and relationships unchanged when editing a link',async()=>{
 await updateDocumentMetadata('account','property',{...original,storage_path:null,link_url:'https://example.com/',link_type:'drive_folder'},'Folder','https://example.com/')
 expect(mock.calls).toContainEqual(['update',{label:'Folder',link_url:'https://example.com/',link_type:'drive_folder'}])
})
it('invalid links never reach the service',async()=>{
 await expect(updateDocumentMetadata('account','property',{...original,storage_path:null,link_url:'https://example.com'},'Label','javascript:alert(1)')).rejects.toThrow('valid http')
 expect(mock.calls).toEqual([])
})
it('does not swallow service errors',async()=>{
 mock.result.error={message:'Permission denied'}
 await expect(updateDocumentMetadata('account','property',original,'New label','')).rejects.toThrow('Permission denied')
})
