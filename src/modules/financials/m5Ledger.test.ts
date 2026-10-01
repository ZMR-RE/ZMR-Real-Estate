import { describe, expect, it } from 'vitest'
import { computeBalanceSheet, computeCashFlow, computeProfitAndLoss } from '../reports/reportsCalculations'
import {
  buildTaxExportCsv,
  computeLedgerTotals,
  formatMoney,
  summarizeByProperty,
  summarizeByPropertyAndCategory,
  summarizeCapitalImprovementsByProperty,
} from './financialsCalculations'
import type { Transaction } from './financialsQueries'
import { EXPECTED, M5_PRINCIPAL_PAYMENTS, M5_PROPERTIES, M5_TRANSACTIONS, in2025 } from './m5Ledger.fixture'

const tx2025 = in2025(M5_TRANSACTIONS)
const principal2025 = in2025(M5_PRINCIPAL_PAYMENTS).reduce((s, p) => s + p.principal_amount, 0)
const onProperty = (id: string) => (rows: Transaction[]) => rows.filter((t) => t.property?.id === id)

function cashFlowFor(rows: Transaction[], principal: number) {
  const pnl = computeProfitAndLoss(rows, [], [])
  return computeCashFlow(pnl, principal, computeLedgerTotals(rows).capitalImprovements)
}

describe('M5 ledger totals against hand-computed expectations', () => {
  it('all properties, 2025', () => {
    const t = computeLedgerTotals(tx2025)
    expect(t).toEqual({
      income: EXPECTED.all2025.income,
      operatingExpense: EXPECTED.all2025.operatingExpense,
      capitalImprovements: EXPECTED.all2025.capitalImprovements,
      netOperating: EXPECTED.all2025.netOperating,
      netAfterAllSpending: EXPECTED.all2025.netAfterAllSpending,
    })
  })

  it('per property, 2025 (property filter)', () => {
    const [maple, cedar] = summarizeByProperty(tx2025)
    const { netCashFlow: _m, ...mapleTotals } = EXPECTED.maple2025
    const { netCashFlow: _c, ...cedarTotals } = EXPECTED.cedar2025
    expect(maple).toEqual({ propertyId: 't2-m5-maple', propertyName: '100 ZMR-TEST-T2 Maple Ln', ...mapleTotals })
    expect(cedar).toEqual({ propertyId: 't2-m5-cedar', propertyName: '200 ZMR-TEST-T2 Cedar Ct', ...cedarTotals })
  })

  it('excludes voided rows and other years', () => {
    expect(computeLedgerTotals(M5_TRANSACTIONS.filter((t) => t.voided))).toEqual({
      income: 0, operatingExpense: 0, capitalImprovements: 0, netOperating: 0, netAfterAllSpending: 0,
    })
    expect(tx2025.some((t) => t.transaction_date === '2024-12-31' || t.transaction_date === '2026-01-03')).toBe(false)
  })

  it('empty ledger is all zeros, not NaN', () => {
    expect(computeLedgerTotals([])).toEqual({ income: 0, operatingExpense: 0, capitalImprovements: 0, netOperating: 0, netAfterAllSpending: 0 })
    expect(cashFlowFor([], 0).netCashFlow).toBe(0)
    expect(summarizeByProperty([])).toEqual([])
    expect(buildTaxExportCsv([], 2025)).not.toContain('Capital improvements')
  })
})

describe('M5 Schedule-E lines keep improvements out of expense categories', () => {
  it('P&L lines match the hand-computed Schedule-E figures', () => {
    const pnl = computeProfitAndLoss(tx2025, [], [])
    const line = (c: string) => [...pnl.incomeLines, ...pnl.expenseLines].find((l) => l.category === c)!.amount
    for (const [category, amount] of Object.entries(EXPECTED.all2025.scheduleE)) expect(line(category)).toBe(amount)
    expect(pnl.totalIncome).toBe(EXPECTED.all2025.income)
    expect(pnl.totalExpense).toBe(EXPECTED.all2025.operatingExpense)
    expect(pnl.netIncome).toBe(EXPECTED.all2025.netOperating)
  })

  it('Financials by-category summary agrees with the P&L (no improvement under Repairs or Cleaning)', () => {
    const rows = summarizeByPropertyAndCategory(tx2025)
    const find = (prop: string, cat: string) => rows.find((r) => r.propertyName.includes(prop) && r.category === cat)
    expect(find('Maple', 'repairs')?.total).toBe(312.4)
    expect(find('Cedar', 'cleaning_and_maintenance')).toBeUndefined()
    const expenseSum = rows.filter((r) => r.entryType === 'expense').reduce((s, r) => s + Math.round(r.total * 100), 0) / 100
    expect(expenseSum).toBe(EXPECTED.all2025.operatingExpense)
  })

  it('improvements are reported once, separately, per property', () => {
    expect(summarizeCapitalImprovementsByProperty(tx2025)).toEqual([
      { propertyId: 't2-m5-maple', propertyName: '100 ZMR-TEST-T2 Maple Ln', total: 4800, count: 1 },
      { propertyId: 't2-m5-cedar', propertyName: '200 ZMR-TEST-T2 Cedar Ct', total: 1000, count: 1 },
    ])
  })
})

describe('M5 Cash Flow includes improvement spending once', () => {
  it('all properties 2025', () => {
    const cf = cashFlowFor(tx2025, principal2025)
    expect(cf.principalPaid).toBe(EXPECTED.all2025.principal)
    expect(cf.capitalImprovementsPaid).toBe(EXPECTED.all2025.capitalImprovements)
    expect(cf.netCashFlow).toBe(EXPECTED.all2025.netCashFlow)
  })

  it('per property 2025, including a negative result', () => {
    const maple = onProperty('t2-m5-maple')(tx2025)
    const maplePrincipal = in2025(M5_PRINCIPAL_PAYMENTS).filter((p) => p.property_id === 't2-m5-maple').reduce((s, p) => s + p.principal_amount, 0)
    expect(cashFlowFor(maple, maplePrincipal).netCashFlow).toBe(EXPECTED.maple2025.netCashFlow)
    expect(cashFlowFor(onProperty('t2-m5-cedar')(tx2025), 0).netCashFlow).toBe(EXPECTED.cedar2025.netCashFlow)
  })

  // The live Practice pass (T2 manual-entry verification) showed Cash
  // Flow +640.49 while real 2025 cash was −4159.51 (the $4,800
  // improvement was missing). Same ledger, no principal, no Cedar
  // improvement.
  it('regression: the live-pass ledger now reports −4159.51, not +640.49', () => {
    const livePass = tx2025.filter((t) => !(t.category === 'cleaning_and_maintenance'))
    expect(cashFlowFor(livePass, 0).netCashFlow).toBe(-4159.51)
  })
})

describe('Balance Sheet cash (assumes a $0 opening balance)', () => {
  it('matches the hand-computed all-time figures; improvements are cash out', () => {
    const bs = computeBalanceSheet(M5_PROPERTIES, M5_TRANSACTIONS, M5_PRINCIPAL_PAYMENTS, [], new Map())
    const cash = Object.fromEntries(bs.rows.map((r) => [r.propertyId, r.cash]))
    expect(cash['t2-m5-maple']).toBe(EXPECTED.balanceSheetCash.maple)
    expect(cash['t2-m5-cedar']).toBe(EXPECTED.balanceSheetCash.cedar)
  })
})

describe('Tax CSV content', () => {
  const csv = buildTaxExportCsv(tx2025, 2025)
  const lines = csv.split('\n')

  it('detail lists every countable 2025 row with treatment, payer and payment method; voided rows excluded', () => {
    const detailStart = lines.indexOf('Property,Type,Category,Treatment,Date,Amount,Payer/payee,Payment method,Description')
    const summaryStart = lines.findIndex((l) => l.startsWith('Summary by property and category'))
    const detail = lines.slice(detailStart + 1, summaryStart - 1)
    expect(detail).toHaveLength(tx2025.filter((t) => !t.voided).length)
    expect(detail).toContain('100 ZMR-TEST-T2 Maple Ln,Expense,Repairs,Capital improvement,2025-06-30,4800.00,ZMR-TEST-T2 Vendor,ZMR-TEST-T2 Bank,ZMR-TEST-T2 m5 #4')
    expect(detail).toContain('100 ZMR-TEST-T2 Maple Ln,Income,Rents received,Income,2025-01-05,1450.00,ZMR-TEST-T2 Tenant,ZMR-TEST-T2 Bank,ZMR-TEST-T2 m5 #1')
    expect(csv).not.toContain('2025-05-05')
  })

  it('summary Repairs is 312.40 and improvements appear in their own section', () => {
    expect(lines).toContain('100 ZMR-TEST-T2 Maple Ln,Expense,Repairs,312.40')
    expect(csv).not.toContain('Repairs,5112.40')
    const improvementsAt = lines.indexOf('Capital improvements (not included in the expense lines above)')
    expect(lines.slice(improvementsAt + 1)).toEqual([
      'Property,Transactions,Total',
      '100 ZMR-TEST-T2 Maple Ln,1,4800.00',
      '200 ZMR-TEST-T2 Cedar Ct,1,1000.00',
    ])
  })
})

describe('formatMoney', () => {
  it('puts the sign before the dollar sign and groups thousands', () => {
    expect(formatMoney(-2822.65)).toBe('-$2,822.65')
    expect(formatMoney(4000)).toBe('$4,000.00')
    expect(formatMoney(0)).toBe('$0.00')
  })
})
