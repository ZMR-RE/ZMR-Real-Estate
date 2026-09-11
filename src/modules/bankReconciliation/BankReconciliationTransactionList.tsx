import type { Transaction } from '../financials/financialsQueries'

interface BankReconciliationTransactionListProps {
  transactions: Transaction[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
}

export function BankReconciliationTransactionList({
  transactions,
  selectedIds,
  onToggle,
}: BankReconciliationTransactionListProps) {
  if (transactions.length === 0) {
    return <p>No transactions in this period for this property.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>On statement</th>
          <th>Date</th>
          <th>Type</th>
          <th>Vendor</th>
          <th>Amount</th>
          <th>Already reconciled</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx) => (
          <tr key={tx.id}>
            <td>
              <input
                type="checkbox"
                checked={selectedIds.has(tx.id)}
                onChange={() => onToggle(tx.id)}
                aria-label={`Include ${tx.vendor?.name ?? 'transaction'} on ${tx.transaction_date}`}
              />
            </td>
            <td>{tx.transaction_date}</td>
            <td>{tx.entry_type === 'income' ? 'Income' : 'Expense'}</td>
            <td>{tx.vendor?.name ?? '—'}</td>
            <td>${tx.amount.toFixed(2)}</td>
            <td>{tx.statement_reconciled ? 'Yes' : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
