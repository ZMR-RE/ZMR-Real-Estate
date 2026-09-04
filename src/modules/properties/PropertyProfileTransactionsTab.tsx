import { CATEGORY_LABELS, type Transaction } from '../financials/financialsQueries'

interface PropertyProfileTransactionsTabProps {
  transactions: Transaction[]
}

// Read-only — editing a transaction happens on the Financials screen itself,
// not duplicated here.
export function PropertyProfileTransactionsTab({ transactions }: PropertyProfileTransactionsTabProps) {
  if (transactions.length === 0) {
    return <p>No transactions for this property yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Category</th>
          <th>Description</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx) => (
          <tr key={tx.id}>
            <td>{tx.transaction_date}</td>
            <td>{tx.entry_type === 'income' ? 'Income' : 'Expense'}</td>
            <td>{CATEGORY_LABELS[tx.category]}</td>
            <td>{tx.description ?? ''}</td>
            <td>${tx.amount.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
