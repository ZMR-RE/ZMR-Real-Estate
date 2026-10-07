import { supabase } from '../../shared/supabaseClient'
import type { DocumentRecord } from './documentsQueries'
import { safeLink } from './libraryLogic'
export async function updateDocumentMetadata(accountId:string,propertyId:string,original:DocumentRecord,label:string,url:string) {
 const clean=label.trim()
 if(!clean||clean.length>255)throw Error('Enter a label of 1–255 characters.')
 const link=original.link_url?safeLink(url):null
 if(original.link_url&&!link)throw Error('Enter a valid http or https web address without a password.')
 const patch=original.link_url?{label:clean,link_url:link,link_type:link===original.link_url?original.link_type:null}:{label:clean}
 let q=supabase.from('documents').update(patch).eq('id',original.id).eq('account_id',accountId).eq('property_id',propertyId)
 q=original.label===null?q.is('label',null):q.eq('label',original.label)
 q=original.link_url===null?q.is('link_url',null):q.eq('link_url',original.link_url)
 q=original.link_type===null?q.is('link_type',null):q.eq('link_type',original.link_type)
 q=original.storage_path===null?q.is('storage_path',null):q.eq('storage_path',original.storage_path)
 const {data,error}=await q.select('id, property_id, transaction_id, category, label, link_url, link_type, storage_path, file_size, uploaded_at').returns<DocumentRecord[]>()
 if(error)throw Error(error.message)
 if(data?.length!==1)throw Error('This item changed or is no longer available. Your entries are kept. Cancel and reopen Edit to see the current details.')
 return data[0]
}
