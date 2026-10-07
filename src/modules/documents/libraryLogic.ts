import type { DocumentRecord } from './documentsQueries'
export type LibraryKind = 'files' | 'links'
export function safeLink(value: string): string | null {
 try { const url=new URL(value.trim());return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null } catch {return null}
}
export function linkKind(doc: DocumentRecord) {
 if(doc.link_type==='drive_folder')return 'Google Drive folder'
 try {const u=new URL(doc.link_url??'');if(u.hostname==='docs.google.com'&&u.pathname.startsWith('/document/'))return 'Google Doc'}catch { /* Old invalid URLs remain visible for correction. */ }
 return 'Other link'
}
export function originalName(doc: DocumentRecord) {return doc.storage_path?.split('/').at(-1)?.replace(/^[0-9a-f]{8}-[0-9a-f-]{27}-/i,'')??''}
export function libraryPage(docs: DocumentRecord[],kind: LibraryKind,query: string,filter: string,page: number,size:25|50) {
 const source=docs.filter(d=>kind==='links'?!!d.link_url:!!d.storage_path)
 const needle=query.trim().toLocaleLowerCase()
 const matches=source.filter(d=>(!filter||(kind==='links'?linkKind(d):d.category)===filter)&&[d.label,originalName(d),d.category,d.link_url].some(v=>v?.toLocaleLowerCase().includes(needle)))
  .sort((a,b)=>b.uploaded_at.localeCompare(a.uploaded_at)||a.id.localeCompare(b.id))
 const pages=Math.max(1,Math.ceil(matches.length/size)),current=Math.min(Math.max(1,page),pages)
 return {total:source.length,count:matches.length,pages,page:current,rows:matches.slice((current-1)*size,current*size)}
}
