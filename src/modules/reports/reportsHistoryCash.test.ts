import { describe, expect, it } from 'vitest'
import type { Transaction } from '../financials/financialsQueries'
import { computeBalanceSheet, computeCashFlow, computeProfitAndLoss } from './reportsCalculations'

// R2/R3 on the real report functions, with history-only entries supplied from
// their own table (design C). Hand-worked numbers; fictional records.
// Claim made: no extra deduction. Claim NOT made: a complete cash position —
// Balance Sheet cash still starts at $0 (no opening cash, roadmap 9.18).

const P = { id: 'zmr-test-t2-h1', name: null, address: '1 ZMR-TEST-T2 Cash Ct' }
let n = 0
const tx = (entry_type: 'income' | 'expense', category: Transaction['category'], amount: number, transaction_date: string) =>
  ({
    id: `zmr-test-t2-h1-${(n += 1)}`, entry_type, category, subcategory: null, vendor: null, tenant: null, prospective_tenant: null,
    unit: null, payment_method: 'ZMR-TEST-T2 Bank', repair_or_improvement: null, amount, transaction_date, description: null,
    voided: false, statement_reconciled: false, property: P, responsible_entity: null, reimbursement_source_id: null,
  }) as Transaction
const normal = (principal_amount: number) => ({ property_id: P.id, principal_amount })
const history = (principal_amount: number) => ({ property_id: P.id, principal_amount })
const RENT = tx('income', 'rents_received', 1450, '2025-03-05')
const sheet = (txs: Transaction[], payments: ReturnType<typeof normal>[], hist: ReturnType<typeof history>[] = []) =>
  computeBalanceSheet([P], txs, payments, [], new Map(), hist)

describe('Balance Sheet R2: history-only principal is never deducted, only disclosed', () => {
  it('without history entries (before H2): identical to today', () => {
    const bs = sheet([RENT], [normal(200)])
    expect(bs.rows[0]).toMatchObject({ cash: 1250, historyPrincipalNotDeducted: 0 })
    expect(bs.totalHistoryPrincipalNotDeducted).toBe(0)
  })
  it('with history entries (after H2): cash unchanged, amount disclosed', () => {
    const bs = sheet([RENT], [normal(200)], [history(300), history(0.1), history(0.2)])
    expect(bs.rows[0]).toMatchObject({ cash: 1250, historyPrincipalNotDeducted: 300.3 })
    expect(bs.totalHistoryPrincipalNotDeducted).toBe(300.3)
  })
  it('Case A (payment before cash tracking began): not deducted — no extra deduction', () => {
    expect(sheet([RENT], [], [history(300)]).rows[0].cash).toBe(1450)
  })
  it('Case B (inside cash coverage): not deducted, so cash is OVERSTATED by 300 — disclosed, not hidden', () => {
    const bs = sheet([RENT], [], [history(300)])
    expect(bs.rows[0].cash).toBe(1450) // a complete position would be 1150; disclosure states the 300
    expect(bs.rows[0].historyPrincipalNotDeducted).toBe(300)
  })
  it('Case C1 (full debit already a Financials expense): no second deduction', () => {
    const bs = sheet([RENT, tx('expense', 'other_interest', 1477.72, '2025-05-01')], [], [history(371.24)])
    expect(bs.rows[0].cash).toBe(-27.72)
  })
  it('Case C2 (Financials holds interest only): principal not deducted — disclosed (would be −27.72 if placeable)', () => {
    const bs = sheet([RENT, tx('expense', 'mortgage_interest', 1106.48, '2025-05-01')], [], [history(371.24)])
    expect(bs.rows[0]).toMatchObject({ cash: 343.52, historyPrincipalNotDeducted: 371.24 })
  })
})

describe('Cash Flow R3: memo line only', () => {
  const pnl = computeProfitAndLoss([RENT], [], [])
  it('memo does not change net cash flow', () => {
    expect(computeCashFlow(pnl, 200, 0, 300)).toMatchObject({ principalPaid: 200, historyPrincipalMemo: 300, netCashFlow: 1250 })
    expect(computeCashFlow(pnl, 200, 0).netCashFlow).toBe(1250)
  })
  it('defaults to no memo (before H2)', () => expect(computeCashFlow(pnl, 200, 0).historyPrincipalMemo).toBe(0))
})
