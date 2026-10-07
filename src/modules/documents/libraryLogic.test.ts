import { describe, it, expect } from 'vitest'
import { libraryPage, originalName, safeLink, linkKind } from './libraryLogic'
import type { DocumentRecord } from './documentsQueries'
const base: DocumentRecord = { id:'a', property_id:'p', transaction_id:null, category:'Mortgage', label:'Statement', link_url:null, link_type:null, storage_path:'a/p/12345678-1234-1234-1234-123456789012-original.pdf', file_size:100, uploaded_at:'2026-10-01T00:00:00Z' }
describe('document library', () => {
 it('separates canonical files and links, with stable full pages', () => {
  const files=Array.from({length:61},(_,i)=>({...base,id:String(i).padStart(3,'0')}))
  const link={...base,id:'link',storage_path:null,link_url:'https://example.com'}
  const rows=[...files,link]
  expect(libraryPage(rows,'files','','',1,25).rows).toHaveLength(25)
  expect(libraryPage(rows,'files','','',3,25).rows).toHaveLength(11)
  expect(libraryPage(rows,'files','','',2,50).rows).toHaveLength(11)
  expect(libraryPage(rows,'links','','',1,25).rows).toEqual([link])
  expect(libraryPage(rows,'files','','',99,25).page).toBe(3)
 })
 it('searches original filename without exposing storage prefix',()=>{
  expect(originalName(base)).toBe('original.pdf')
  expect(libraryPage([base],'files',' ORIGINAL.PDF ','Mortgage',5,25).count).toBe(1)
  expect(libraryPage([base],'files','original','Insurance',1,25).count).toBe(0)
 })
 it('handles empty accounts and filtered empty pages',()=>{
  expect(libraryPage([],'files','','',4,50)).toMatchObject({page:1,pages:1,count:0,total:0,rows:[]})
 })
 it('rejects executable and credential-bearing links',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,hi','file:///etc/passwd','https://person:pass@example.com']) expect(safeLink(url)).toBeNull()
  expect(safeLink(' https://example.com/a ')).toBe('https://example.com/a')
 })
 it('classifies shortcuts without treating a similar hostname as Google Docs',()=>{
  expect(linkKind({...base,link_url:'https://docs.google.com/document/d/123'})).toBe('Google Doc')
  expect(linkKind({...base,link_url:'https://docs.google.com.example.org/document/d/123'})).toBe('Other link')
  expect(linkKind({...base,link_type:'drive_folder'})).toBe('Google Drive folder')
 })
})
