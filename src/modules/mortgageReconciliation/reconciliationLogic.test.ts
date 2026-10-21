import { describe, expect, it } from 'vitest'
import { allocationCheck, matchPayment, reviewDraft, statementBridge, validateSource } from './reconciliationLogic'
import type { SourceActivity, ExistingPayment } from './reconciliationTypes'
const scope = { accountId:'a', propertyId:'p', mortgageId:'m' }
const row: SourceActivity = { ...scope, sourceId:`${'a'.repeat(64)}:1`, digest:'a'.repeat(64), documentId:'d', line:1, statementDate:'2026-09-04', postedDate:'2026-09-04', kind:'payment', total:'414.19', principal:'238.07', interest:'149.57', escrow:'26.55' }
const reference = { date:'2026-09-04', principal:'44859.71', escrow:'0', revision:1 }
const existing: ExistingPayment = { ...scope, id:'existing', postedDate:row.postedDate, total:row.total, principal:row.principal, interest:row.interest, escrow:row.escrow, voided:false }
describe('statement allocation and source review',()=>{
 it('requires escrow in the full payment and gives exact shortfall',()=>{expect(allocationCheck(row).valid).toBe(true);expect(allocationCheck({...row,escrow:'0'})).toEqual({valid:false,message:'$26.55 still needs allocation'})})
 it('explains excess without rounding',()=>{expect(allocationCheck({...row,escrow:'30'}).message).toBe('Allocations exceed total by $3.45');expect(allocationCheck({...row,total:'414.199'}).valid).toBe(false)})
 it.each(['','1e2','NaN','99999999999999999','-1'])('refuses invalid payment total %s',total=>{expect(allocationCheck({...row,total}).valid).toBe(false)})
 it('keeps zero valid and blank invalid for allocations',()=>{expect(allocationCheck({...row,escrow:''}).valid).toBe(false);expect(allocationCheck({...row,total:'387.64',escrow:'0'}).valid).toBe(true)})
 it('retains the exact existing ID, never adds a duplicate',()=>{expect(reviewDraft(scope,row,[existing],reference,true,[])).toMatchObject({action:'retain_existing',existingId:'existing',currentPrincipalEffect:'0.00',currentEscrowEffect:'0.00'})})
 it('blocks same-total different-split and ambiguous existing records',()=>{expect(matchPayment(scope,row,[{...existing,principal:'239'}]).status).toBe('conflict');expect(matchPayment(scope,row,[existing,{...existing,id:'two'}]).status).toBe('conflict')})
 it('flags legacy unlinked payments without assigning them to this loan',()=>{expect(matchPayment(scope,row,[{...existing,mortgageId:null}]).status).toBe('conflict')})
 it('ignores voided matches but refuses another account or loan',()=>{expect(matchPayment(scope,row,[{...existing,voided:true}]).status).toBe('missing');expect(()=>matchPayment(scope,row,[{...existing,accountId:'other'}])).toThrow();expect(()=>validateSource(scope,{...row,mortgageId:'other'})).toThrow()})
 it('requires source confirmation and a dated reference',()=>{expect(()=>reviewDraft(scope,row,[],reference,false,[])).toThrow();expect(()=>reviewDraft(scope,row,[],null,true,[])).toThrow();expect(()=>reviewDraft(scope,row,[],{...reference,date:'2026-02-30'},true,[])).toThrow()})
 it('does not turn future activity into balance-neutral history',()=>{expect(()=>reviewDraft(scope,row,[],{...reference,date:'2026-09-01'},true,[])).toThrow('after the reference')})
 it('does not admit repeated source lines or another same-date same-total draft',()=>{const draft=reviewDraft(scope,row,[],reference,true,[]);expect(()=>reviewDraft(scope,row,[],reference,true,[draft])).toThrow('already');expect(()=>reviewDraft(scope,{...row,line:2,sourceId:`${row.digest}:2`},[],reference,true,[draft])).toThrow('Similar')})
 it('rejects fabricated source identities and later posted dates',()=>{expect(()=>validateSource(scope,{...row,sourceId:'fake'})).toThrow();expect(()=>validateSource(scope,{...row,postedDate:'2026-09-05'})).toThrow()})
 it('balances signed reversal effects without calling them cash',()=>{
  const reversal:SourceActivity={...row,kind:'reversal',total:'0',principal:'-387.64',interest:'0',escrow:'0'}
  const bridge=statementBridge(scope,{...scope,documentId:'old',date:'2026-08-01',principal:'1000',escrow:'0'},{...scope,documentId:'d',date:row.statementDate,principal:'1387.64',escrow:'0'},[reversal])
  expect(bridge.balancesMatch).toBe(true);expect(reviewDraft(scope,reversal,[],reference,true,[]).action).toBe('historical_adjustment')
 })
 it('preserves negative historical escrow',()=>{const disbursement:SourceActivity={...row,kind:'escrow_disbursement',total:'26.55',principal:'0',interest:'0',escrow:'-26.55'};expect(statementBridge(scope,{...scope,documentId:'old',date:'2026-08-01',principal:'1000',escrow:'0'},{...scope,documentId:'d',date:row.statementDate,principal:'1000',escrow:'-26.55'},[disbursement]).balancesMatch).toBe(true)})
 it('exposes gaps even when balances happen to match',()=>{expect(statementBridge(scope,{...scope,documentId:'old',date:'2026-06-01',principal:'45097.78',escrow:'-26.55'},{...scope,documentId:'d',date:row.statementDate,principal:'44859.71',escrow:'0'},[row])).toMatchObject({balancesMatch:true,missingMonths:2})})
 it('refuses double-counted or overlapping activity in a bridge',()=>{const p={...scope,documentId:'old',date:'2026-08-01',principal:'45097.78',escrow:'-26.55'},n={...scope,documentId:'d',date:row.statementDate,principal:'44859.71',escrow:'0'};expect(()=>statementBridge(scope,p,n,[row,row])).toThrow();expect(()=>statementBridge(scope,p,n,[{...row,postedDate:'2026-07-01'}])).toThrow()})
})
