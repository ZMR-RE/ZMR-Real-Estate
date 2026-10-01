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

// How many selected entries a reconciliation save did not mark as matched
// (e.g. one was voided in the meantime), and the message to show for it.
export function reconciliationShortfall(requestedIds: string[], updatedIds: string[]): string | null {
  const updated = new Set(updatedIds)
  const missed = requestedIds.filter((id) => !updated.has(id)).length
  if (missed === 0) return null
  return `${missed} selected ${missed === 1 ? 'transaction was' : 'transactions were'} not marked as matched — ${missed === 1 ? 'it was' : 'they were'} voided or changed in the meantime. Review the list and try again.`
}
