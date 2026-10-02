import { describe, expect, it } from 'vitest'
import { computeBalanceSheet, computeCashFlow, computeProfitAndLoss } from './reportsCalculations'
import { resolveHistoryPrincipal, sumHistoryPrincipal } from './reportsHistory'

// P2 end-to-end: the rows H1's exact queries returned for member A on T1's ACTUAL H2 migration
// (supabase/tests/h1_history_reports/run.sh exports them), fed through H1's real resolve + report
// functions. Runs only when run.sh passes the rows in VITE_P2_RESULTS (JSON); skipped in the normal suite.
const raw = import.meta.env.VITE_P2_RESULTS as string | undefined
const A = { id: 'a2b00000-0000-0000-0000-00000000000b', name: null, address: '1 ZMR-TEST-T2 A Ct' }
const A2 = { id: 'a2b20000-0000-0000-0000-00000000000b', name: null, address: '3 ZMR-TEST-T2 A2 Ct' }
const NORMAL = [{ property_id: A.id, principal_amount: 200 }]

describe.skipIf(!raw)('H1 on the real H2 migration (member A)', () => {
  const rows = raw ? JSON.parse(raw) : { allTime: [], year2025: [] }
  const allTime = resolveHistoryPrincipal({ data: rows.allTime, error: null }).rows
  const year = resolveHistoryPrincipal({ data: rows.year2025, error: null }).rows

  it('Balance Sheet: disclosure per property 601.00 / 150.50 (voided excluded), cash identical to no history', () => {
    const withHistory = computeBalanceSheet([A, A2], [], NORMAL, [], new Map(), allTime)
    const without = computeBalanceSheet([A, A2], [], NORMAL, [], new Map(), [])
    expect(withHistory.rows.map((r) => [r.propertyId, r.historyPrincipalNotDeducted])).toEqual([[A.id, 601], [A2.id, 150.5]])
    expect(withHistory.totalHistoryPrincipalNotDeducted).toBe(751.5)
    expect(withHistory.rows.map((r) => r.cash)).toEqual(without.rows.map((r) => r.cash))
    expect(withHistory.totalCash).toBe(without.totalCash)
  })
  it('Cash Flow 2025: memo 301.00, net cash flow unchanged', () => {
    const pnl = computeProfitAndLoss([], [], [])
    expect(sumHistoryPrincipal(year)).toBe(301)
    expect(computeCashFlow(pnl, 200, 0, sumHistoryPrincipal(year))).toMatchObject({ historyPrincipalMemo: 301, netCashFlow: computeCashFlow(pnl, 200, 0).netCashFlow })
  })
  it('property filter: A2 only → 150.50', () => expect(sumHistoryPrincipal(allTime, A2.id)).toBe(150.5))
})
