import { expect,it } from 'vitest'
import { coverageGaps,filterStatements,validateMetadata } from './organizationLogic'
import type { StatementDocument,StatementMetadata } from './statementTypes'
const doc=(start:string,end:string):StatementDocument=>({id:start,accountId:'a',propertyId:'p',mortgageId:'m',originalFilename:'source.pdf',displayName:'Bank statement',digest:'d',statementDate:end,uploadedAt:end,periodStart:start,periodEnd:end,loanStatus:'needs_review',booksStatus:'not_reconciled'})
const metadata:StatementMetadata={displayName:'Label',statementDate:null,periodStart:null,periodEnd:null,mortgageId:'m',documentKind:'statement'}
it('leaves unknown dates unknown',()=>expect(()=>validateMetadata(metadata)).not.toThrow())
it('rejects invalid dates and incomplete or reversed periods',()=>{
 for(const v of [{statementDate:'2026-02-30'},{periodStart:'2026-01-01'},{periodStart:'2026-03-02',periodEnd:'2026-03-01'}])expect(()=>validateMetadata({...metadata,...v})).toThrow()
})
it('only identifies uncovered days between known periods, handling overlaps',()=>{
 const docs=[doc('2026-01-01','2026-01-31'),doc('2026-01-15','2026-02-10'),doc('2026-03-01','2026-03-31')]
 expect(coverageGaps(docs)).toEqual([{start:'2026-02-11',end:'2026-02-28'}])
})
it('never invents a missing period around a single statement or tax form',()=>{
 expect(coverageGaps([doc('2026-01-01','2026-01-31')])).toEqual([])
 expect(coverageGaps([doc('2026-01-01','2026-01-31'),{...doc('2026-12-01','2026-12-31'),documentKind:'tax_statement'}])).toEqual([])
})
it('combines year, status, and literal case-insensitive search',()=>{
 const d=doc('2026-01-01','2026-01-31'),missing={...d,id:'missing',statementDate:null,periodStart:null,periodEnd:null}
 expect(filterStatements([d,missing],'BANK','ready','2026')).toEqual([d])
 expect(filterStatements([d,missing],'source.pdf','needs','all')).toEqual([missing])
 expect(filterStatements([d],'','all','2025')).toEqual([])
})
