import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Category,
  type Transaction,
} from '../financials/financialsQueries'
import type { ChartAccount, CategoryMapping } from '../chartOfAccounts/chartOfAccountsQueries'
import type { HistoryPaymentPrincipal, MortgagePaymentPrincipal } from './reportsQueries'
import type { PortfolioMortgageRow } from '../mortgagePayoff/mortgagePayoffQueries'
import { propertyLabel } from '../../shared/propertyLabel'
import { computeLedgerTotals, totalsByScheduleECategory } from '../financials/financialsCalculations'

export interface ReportLine {
  category: Category
  label: string
  amount: number
}

export interface ProfitAndLoss {
  incomeLines: ReportLine[]
  expenseLines: ReportLine[]
  totalIncome: number
  totalExpense: number
  netIncome: number
}

// A category's line label is its mapped Chart of Accounts name (9.1) when
// one exists, so renaming an account there is reflected here too —
// falling back to the Schedule E category label only if a category is
// somehow unmapped (shouldn't happen; every category is seeded with a
// mapping, see 20260910210000_chart_of_accounts.sql).
function labelForCategory(
  category: Category,
  accountsById: Map<string, ChartAccount>,
  chartAccountIdByCategory: Map<Category, string>,
): string {
  const chartAccountId = chartAccountIdByCategory.get(category)
  const account = chartAccountId ? accountsById.get(chartAccountId) : undefined
  return account?.name ?? CATEGORY_LABELS[category]
}

// Schedule E format: every standard line shown, even at $0, matching how
// the real IRS form lays out (not just categories with activity this
// period — that's the existing "by property and category" table in
// Financials).
export function computeProfitAndLoss(
  transactions: Transaction[],
  chartOfAccounts: ChartAccount[],
  categoryMappings: CategoryMapping[],
): ProfitAndLoss {
  const accountsById = new Map(chartOfAccounts.map((a) => [a.id, a]))
  const chartAccountIdByCategory = new Map(categoryMappings.map((m) => [m.category, m.chart_account_id]))

  // Improvement-flagged expenses are capital, not expense lines (they
  // feed cost basis/depreciation directly from financial_transactions).
  // M5 moved that rule into financialsCalculations.ledgerTreatment so the
  // Financials summary and tax CSV apply the identical definition.
  const totalByCategory = totalsByScheduleECategory(transactions)

  const toLine = (category: Category): ReportLine => ({
    category,
    label: labelForCategory(category, accountsById, chartAccountIdByCategory),
    amount: totalByCategory.get(category) ?? 0,
  })

  const incomeLines = INCOME_CATEGORIES.map(toLine)
  const expenseLines = EXPENSE_CATEGORIES.map(toLine)
  const ledger = computeLedgerTotals(transactions)
  const totalIncome = ledger.income
  const totalExpense = ledger.operatingExpense

  return { incomeLines, expenseLines, totalIncome, totalExpense, netIncome: ledger.netOperating }
}

export interface CashFlow {
  // Option B (R3): principal of history-only mortgage entries in the year —
  // a memo only, never part of netCashFlow (it is already in a loan's opening
  // balance, and when cash tracking began isn't recorded).
  historyPrincipalMemo: number
  netIncome: number
  depreciationAddBack: number
  cashFromOperations: number
  principalPaid: number
  capitalImprovementsPaid: number
  netCashFlow: number
}

// Distinct from net income in three ways real estate owners actually
// feel: depreciation is a P&L expense that never leaves the bank account
// (added back); mortgage principal leaves the bank account without ever
// being a P&L expense (subtracted as financing); and capital improvements
// leave the bank account but are capital, not P&L expense (subtracted
// once, here, as investing spending — M5; previously omitted, so Cash
// Flow overstated cash by the full improvement amount).
// principalPaid is sourced from mortgage payment records; improvements
// from the same transactions the P&L used, via ledgerTreatment.
export function computeCashFlow(
  profitAndLoss: ProfitAndLoss,
  principalPaid: number,
  capitalImprovementsPaid: number,
  historyPrincipalMemo = 0,
): CashFlow {
  const depreciationAddBack = profitAndLoss.expenseLines.find((line) => line.category === 'depreciation')?.amount ?? 0
  const cents = (n: number) => Math.round(n * 100)
  const cashFromOperations = (cents(profitAndLoss.netIncome) + cents(depreciationAddBack)) / 100

  return {
    historyPrincipalMemo,
    netIncome: profitAndLoss.netIncome,
    depreciationAddBack,
    cashFromOperations,
    principalPaid,
    capitalImprovementsPaid,
    netCashFlow: (cents(cashFromOperations) - cents(principalPaid) - cents(capitalImprovementsPaid)) / 100,
  }
}

export interface BalanceSheetRow {
  // Option B (R2): history-only principal NOT deducted from cash — disclosed.
  historyPrincipalNotDeducted: number
  propertyId: string
  propertyName: string
  marketValue: number | null
  cash: number
  mortgageBalance: number
  equity: number | null
}

export interface BalanceSheet {
  rows: BalanceSheetRow[]
  totalMarketValue: number
  totalCash: number
  totalMortgageBalance: number
  totalEquity: number
  propertiesMissingMarketValue: number
  totalHistoryPrincipalNotDeducted: number
}

// "Cash" here is a cash-basis running balance since inception, not a
// tracked bank balance: all-time (income − expense) from
// financial_transactions, less all-time mortgage principal paid (a real
// cash outflow that reduces a liability rather than showing as a P&L
// expense, so it isn't in that income/expense figure at all). There's no
// recorded opening balance to start from — see roadmap 9.18, which
// explicitly defers establishing real opening balances to a later item —
// so this assumes $0 cash at time zero, same simplification the rest of
// this app's reporting makes today.
//
// Per CLAUDE.md's Data integrity rule, a property with no market value on
// file shows a blank equity rather than a guessed one (treating it as
// $0 would silently understate equity for a real, valuable property that
// just hasn't had its value entered yet).
//
// latestMarketValues comes from the property_value_logs history (roadmap
// 7.19) — each property's most recent market_value entry — rather than a
// static properties.market_value column, keyed by property id.
export function computeBalanceSheet(
  properties: { id: string; name: string | null; address: string | null }[],
  transactionsAllTime: Transaction[],
  mortgagePaymentsAllTime: MortgagePaymentPrincipal[],
  portfolioMortgages: PortfolioMortgageRow[],
  latestMarketValues: Map<string, number>,
  // Option B (R2): history-only entries (separate table) are never deducted
  // here — not reliably placeable in the cash period, and possibly already in
  // a Financials record — only reported back for disclosure.
  historyPrincipalAllTime: HistoryPaymentPrincipal[] = [],
): BalanceSheet {
  const netCashByProperty = new Map<string, number>()
  for (const tx of transactionsAllTime) {
    if (!tx.property || tx.voided) continue
    // Every expense, including capital improvements, is cash out here.
    const signedCents = Math.round(Number(tx.amount) * 100) * (tx.entry_type === 'income' ? 1 : -1)
    netCashByProperty.set(tx.property.id, (netCashByProperty.get(tx.property.id) ?? 0) + signedCents)
  }

  const principalPaidByProperty = new Map<string, number>()
  for (const payment of mortgagePaymentsAllTime) {
    principalPaidByProperty.set(
      payment.property_id,
      (principalPaidByProperty.get(payment.property_id) ?? 0) + Number(payment.principal_amount),
    )
  }

  const historyByProperty = new Map<string, number>()
  for (const entry of historyPrincipalAllTime) {
    historyByProperty.set(entry.property_id, (historyByProperty.get(entry.property_id) ?? 0) + Math.round(Number(entry.principal_amount) * 100))
  }

  const mortgageBalanceByProperty = new Map(
    portfolioMortgages.map((m) => [m.property_id, Number(m.current_balance)]),
  )

  const rows: BalanceSheetRow[] = properties.map((property) => {
    const netCents = netCashByProperty.get(property.id) ?? 0
    const principalPaid = principalPaidByProperty.get(property.id) ?? 0
    const cash = (netCents - Math.round(principalPaid * 100)) / 100
    const mortgageBalance = mortgageBalanceByProperty.get(property.id) ?? 0
    const marketValue = latestMarketValues.get(property.id) ?? null
    const equity = marketValue === null ? null : marketValue + cash - mortgageBalance

    const historyPrincipalNotDeducted = (historyByProperty.get(property.id) ?? 0) / 100
    return { historyPrincipalNotDeducted, propertyId: property.id, propertyName: propertyLabel(property), marketValue, cash, mortgageBalance, equity }
  })

  return {
    rows,
    totalMarketValue: rows.reduce((sum, row) => sum + (row.marketValue ?? 0), 0),
    totalCash: rows.reduce((sum, row) => sum + row.cash, 0),
    totalMortgageBalance: rows.reduce((sum, row) => sum + row.mortgageBalance, 0),
    totalEquity: rows.reduce((sum, row) => sum + (row.equity ?? 0), 0),
    propertiesMissingMarketValue: rows.filter((row) => row.marketValue === null).length,
    totalHistoryPrincipalNotDeducted: rows.reduce((sum, row) => sum + Math.round(row.historyPrincipalNotDeducted * 100), 0) / 100,
  }
}
