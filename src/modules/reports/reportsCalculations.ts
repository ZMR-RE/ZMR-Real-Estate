import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Category,
  type Transaction,
} from '../financials/financialsQueries'
import type { ChartAccount, CategoryMapping } from '../chartOfAccounts/chartOfAccountsQueries'
import type { MortgagePaymentPrincipal } from './reportsQueries'
import type { PortfolioMortgageRow } from '../mortgagePayoff/mortgagePayoffQueries'
import { propertyLabel } from '../../shared/propertyLabel'

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

  const totalByCategory = new Map<Category, number>()
  for (const tx of transactions) {
    totalByCategory.set(tx.category, (totalByCategory.get(tx.category) ?? 0) + tx.amount)
  }

  const toLine = (category: Category): ReportLine => ({
    category,
    label: labelForCategory(category, accountsById, chartAccountIdByCategory),
    amount: totalByCategory.get(category) ?? 0,
  })

  const incomeLines = INCOME_CATEGORIES.map(toLine)
  const expenseLines = EXPENSE_CATEGORIES.map(toLine)
  const totalIncome = incomeLines.reduce((sum, line) => sum + line.amount, 0)
  const totalExpense = expenseLines.reduce((sum, line) => sum + line.amount, 0)

  return { incomeLines, expenseLines, totalIncome, totalExpense, netIncome: totalIncome - totalExpense }
}

export interface CashFlow {
  netIncome: number
  depreciationAddBack: number
  cashFromOperations: number
  principalPaid: number
  netCashFlow: number
}

// Distinct from net income in two ways real estate owners actually feel:
// depreciation is a P&L expense that never leaves the bank account (added
// back), and mortgage principal leaves the bank account without ever
// being a P&L expense (subtracted as a financing use of cash) — so a
// property can show a paper loss and still be cash-flow positive, or the
// reverse.
export function computeCashFlow(profitAndLoss: ProfitAndLoss, principalPaid: number): CashFlow {
  const depreciationAddBack = profitAndLoss.expenseLines.find((line) => line.category === 'depreciation')?.amount ?? 0
  const cashFromOperations = profitAndLoss.netIncome + depreciationAddBack

  return {
    netIncome: profitAndLoss.netIncome,
    depreciationAddBack,
    cashFromOperations,
    principalPaid,
    netCashFlow: cashFromOperations - principalPaid,
  }
}

export interface BalanceSheetRow {
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
export function computeBalanceSheet(
  properties: { id: string; name: string; address: string | null; market_value: string | null }[],
  transactionsAllTime: Transaction[],
  mortgagePaymentsAllTime: MortgagePaymentPrincipal[],
  portfolioMortgages: PortfolioMortgageRow[],
): BalanceSheet {
  const netCashByProperty = new Map<string, number>()
  for (const tx of transactionsAllTime) {
    if (!tx.property) continue
    const signedAmount = tx.entry_type === 'income' ? tx.amount : -tx.amount
    netCashByProperty.set(tx.property.id, (netCashByProperty.get(tx.property.id) ?? 0) + signedAmount)
  }

  const principalPaidByProperty = new Map<string, number>()
  for (const payment of mortgagePaymentsAllTime) {
    principalPaidByProperty.set(
      payment.property_id,
      (principalPaidByProperty.get(payment.property_id) ?? 0) + Number(payment.principal_amount),
    )
  }

  const mortgageBalanceByProperty = new Map(
    portfolioMortgages.map((m) => [m.property_id, Number(m.current_balance)]),
  )

  const rows: BalanceSheetRow[] = properties.map((property) => {
    const netIncome = netCashByProperty.get(property.id) ?? 0
    const principalPaid = principalPaidByProperty.get(property.id) ?? 0
    const cash = netIncome - principalPaid
    const mortgageBalance = mortgageBalanceByProperty.get(property.id) ?? 0
    const marketValue = property.market_value !== null ? Number(property.market_value) : null
    const equity = marketValue === null ? null : marketValue + cash - mortgageBalance

    return { propertyId: property.id, propertyName: propertyLabel(property), marketValue, cash, mortgageBalance, equity }
  })

  return {
    rows,
    totalMarketValue: rows.reduce((sum, row) => sum + (row.marketValue ?? 0), 0),
    totalCash: rows.reduce((sum, row) => sum + row.cash, 0),
    totalMortgageBalance: rows.reduce((sum, row) => sum + row.mortgageBalance, 0),
    totalEquity: rows.reduce((sum, row) => sum + (row.equity ?? 0), 0),
    propertiesMissingMarketValue: rows.filter((row) => row.marketValue === null).length,
  }
}
