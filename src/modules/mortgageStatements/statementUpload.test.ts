import { describe, expect, it, vi } from 'vitest'
import { createStatementUploader } from './statementUpload'
import { assertScope, prepareStatementFiles, statementPage, suggestedStatementName, validStatementDate } from './statementLogic'
import type { StatementDocument, StatementStore, UploadRow } from './statementTypes'
const scope = { accountId: 'A', propertyId: 'P', mortgageId: 'M' }
const row = (id: string): UploadRow => ({status:'ready', input:{requestId:id,file:new File(['%PDF-1.4\n'],`${id}.pdf`),digest:id,originalFilename:`${id}.pdf`,displayName:`${id}.pdf`,statementDate:null}})
const doc = (id: string): StatementDocument => ({...scope,id,originalFilename:`${id}.pdf`,displayName:`${id}.pdf`,digest:id,statementDate:null,uploadedAt:'2026-10-06',loanStatus:'needs_review',booksStatus:'not_reconciled'})
function store(upload: StatementStore['upload']): StatementStore { return {upload,list:async()=>[],open:async()=>new Blob()} }
describe('statement upload safety',()=>{
  it('blocks same-turn duplicate submission before the upload resolves',async()=>{
    let release!: (doc: StatementDocument)=>void
    const upload=vi.fn(()=>new Promise<StatementDocument>(resolve=>{release=resolve}))
    const run=createStatementUploader(store(upload),scope)
    const first=run([row('1')],()=>{})
    expect(await run([row('1')],()=>{})).toBe(false)
    expect(upload).toHaveBeenCalledTimes(1)
    release(doc('1')); await first
  })
  it('retries only unfinished rows and preserves request identity after lost response',async()=>{
    const rows=[row('1'),row('2')]; let fail=true
    const upload=vi.fn(async(_scope,input)=>{if(input.requestId==='2'&&fail){fail=false;throw Error('Response lost')}return doc(input.requestId)})
    const run=createStatementUploader(store(upload),scope)
    const update=(id:string,change:Partial<UploadRow>)=>Object.assign(rows.find(r=>r.input.requestId===id)!,change)
    await run(rows,update); expect(rows.map(r=>r.status)).toEqual(['saved','failed'])
    await run(rows,update); expect(upload.mock.calls.map(c=>c[1].requestId)).toEqual(['1','2','2'])
    expect(rows.map(r=>r.status)).toEqual(['saved','saved'])
  })
  it('refuses a returned document from another account or loan',async()=>{
    for(const change of [{accountId:'B'},{propertyId:'Q'},{mortgageId:'N'}]){
      const update=vi.fn();await createStatementUploader(store(async()=>({...doc('1'),...change})),scope)([row('1')],update)
      expect(update.mock.calls.at(-1)?.[1].status).toBe('failed')
    }
  })
  it('rejects invalid calendar dates and never guesses from a filename',()=>{
    expect(validStatementDate('2026-02-30')).toBe(false)
    expect(suggestedStatementName('Bank','12345678','2026-09-04')).toBe('Bank •5678 — Statement — 2026-09-04.pdf')
  })
  it('detects duplicate bytes within a selection and across the batch',async()=>{
    const file=new File(['%PDF-1.4\nunique'],'wrong-date.pdf')
    const prepared=await prepareStatementFiles([file,file],[])
    expect(prepared).toHaveLength(1); expect(prepared[0].input.statementDate).toBeNull()
    expect(await prepareStatementFiles([file],prepared)).toHaveLength(0)
  })
  it('rejects disguised non-PDF and empty files',async()=>{
    await expect(prepareStatementFiles([new File(['<html>'],'fake.pdf')],[])).rejects.toThrow('not a PDF')
    await expect(prepareStatementFiles([new File([],'empty.pdf')],[])).rejects.toThrow('25 MB')
  })
  it('paginates five and clamps after the list changes',()=>{
    const docs=Array.from({length:6},(_,i)=>doc(String(i)))
    expect(statementPage(docs,0).rows).toHaveLength(5)
    expect(statementPage(docs,1).rows).toHaveLength(1)
    expect(statementPage(docs.slice(0,2),1).page).toBe(0)
    expect(statementPage([],0).rows).toHaveLength(0)
  })
  it('keeps missing dates visible ahead of dated statements',()=>{
    expect(statementPage([{...doc('dated'),statementDate:'2026-10-01'},doc('unknown')],0).rows[0].id).toBe('unknown')
    expect(()=>assertScope({...doc('x'),accountId:'B'},scope)).toThrow()
  })
})
