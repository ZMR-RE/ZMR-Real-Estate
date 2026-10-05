import { describe, expect, it } from 'vitest'
import { paginate, summarizeYearPayments } from './mortgageTabLogic'
import { projectedBalances, recordedPoints } from './presentationLogic'
import { simulatePayoff } from '../mortgagePayoff/mortgagePayoffMath'
describe('mortgage presentation boundaries', () => {
  it('clamps pagination after filtering', () => {
    expect(paginate([1,2,3,4,5,6],1).rangeLabel).toBe('6–6 of 6')
    expect(paginate([1,2,3,4,5],1)).toMatchObject({page:0,rangeLabel:'1–5 of 5'})
    expect(paginate([],4).rangeLabel).toBe('')
  })
  it('counts this loan including history; excludes voided and unlinked entries', () => {
    const p = {payment_date:'2026-01-01', principal_amount:100, interest_amount:0, mortgage_id:'loan', voided:false}
    expect(summarizeYearPayments([p,{...p,payment_date:'2026-03-01',history_only:true},{...p,voided:true},{...p,mortgage_id:null},{...p,mortgage_id:'old'}],'loan',2026)).toMatchObject({unlinkedCount:1,summary:{principal:200,interest:0,count:2,historyOnlyCount:1,monthsWithoutPayment:['2026-02']}})
    expect(summarizeYearPayments([{...p,mortgage_id:null}],'loan',2026).summary).toBeNull()
  })
  it('does not invent balances or assign ambiguous causes', () => {
    const r={id:'a',changed_at:'2026-01-01T00:00:00Z',new_value:'0'}
    expect(recordedPoints([r,{...r,id:'b',new_value:null},{...r,id:'c',new_value:''}])).toEqual([{id:'a',at:r.changed_at,balance:0,cause:'Recorded balance change · cause not linked'}])
  })
  it.each([{balance:200000,annualRatePercent:6,monthlyPayment:1600},{balance:200000,annualRatePercent:6,monthlyPayment:2100},{balance:150000,annualRatePercent:6,monthlyPayment:1600},{balance:1000,annualRatePercent:0,monthlyPayment:300}])('projection matches established payoff math: %o', input => {
    const points=projectedBalances(input)
    expect(points.length-1).toBe(simulatePayoff(input)?.months)
    expect(points.at(-1)).toBe(0)
    expect(points[0]).toBe(input.balance)
  })
  it('rejects non-amortizing projections',()=>expect(projectedBalances({balance:200000,annualRatePercent:6,monthlyPayment:100})).toEqual([]))
})
