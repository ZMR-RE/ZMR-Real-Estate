import type { Transaction } from '../financials/financialsQueries'

export function filterByPeriod(transactions: Transaction[], periodStart: string, periodEnd: string): Transaction[] {
  return transactions.filter((tx) => tx.transaction_date >= periodStart && tx.transaction_date <= periodEnd)
}

export interface ReconciliationResult {
  clearedIncome: number
  clearedExpense: number
  computedEndingBalance: number
  discrepancy: number
  isBalanced: boolean
}

// Rounds to cents before comparing so float arithmetic on amounts like
// 19.99 + 0.01 doesn't produce a false discrepancy.
function toCents(value: number): number {
  return Math.round(value * 100)
}

export function computeReconciliation(
  startingBalance: number,
  clearedTransactions: Transaction[],
  endingStatementBalance: number,
): ReconciliationResult {
  const clearedIncome = clearedTransactions
    .filter((tx) => tx.entry_type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const clearedExpense = clearedTransactions
    .filter((tx) => tx.entry_type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const computedEndingBalance = startingBalance + clearedIncome - clearedExpense
  const discrepancy = computedEndingBalance - endingStatementBalance

  return {
    clearedIncome,
    clearedExpense,
    computedEndingBalance,
    discrepancy,
    isBalanced: toCents(computedEndingBalance) === toCents(endingStatementBalance),
  }
}
