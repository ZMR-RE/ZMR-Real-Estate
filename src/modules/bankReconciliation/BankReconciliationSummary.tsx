import type { ReconciliationResult } from './bankReconciliationCalculations'

interface BankReconciliationSummaryProps {
  startingBalance: string
  endingBalance: string
  result: ReconciliationResult
  hasEnteredBalances: boolean
  canMarkReconciled: boolean
  saving: boolean
  onMarkReconciled: () => void
}

export function BankReconciliationSummary({
  startingBalance,
  endingBalance,
  result,
  hasEnteredBalances,
  canMarkReconciled,
  saving,
  onMarkReconciled,
}: BankReconciliationSummaryProps) {
  return (
    <div>
      <p>Starting balance: ${(Number(startingBalance) || 0).toFixed(2)}</p>
      <p>+ Cleared income: ${result.clearedIncome.toFixed(2)}</p>
      <p>- Cleared expenses: ${result.clearedExpense.toFixed(2)}</p>
      <p>
        <strong>Computed ending balance: ${result.computedEndingBalance.toFixed(2)}</strong>
      </p>
      <p>Statement ending balance: ${(Number(endingBalance) || 0).toFixed(2)}</p>

      {hasEnteredBalances && (
        <p role={result.isBalanced ? undefined : 'alert'}>
          {result.isBalanced
            ? 'Balanced — computed ending balance matches the statement.'
            : `Discrepancy: $${Math.abs(result.discrepancy).toFixed(2)} ${
                result.discrepancy > 0 ? 'over' : 'short'
              } vs. the statement.`}
        </p>
      )}

      <button type="button" onClick={onMarkReconciled} disabled={!canMarkReconciled || saving}>
        {saving ? 'Saving…' : 'Mark selected transactions reconciled'}
      </button>
    </div>
  )
}
