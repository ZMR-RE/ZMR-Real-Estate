import type { MortgageEscrowTransaction } from './mortgagePayoffQueries'

interface EscrowTransactionListProps {
  transactions: MortgageEscrowTransaction[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function EscrowTransactionList({ transactions }: EscrowTransactionListProps) {
  if (transactions.length === 0) {
    return <p>No escrow transactions logged yet.</p>
  }

  return (
    <table className="escrow-transaction-list">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((transaction) => (
          <tr key={transaction.id}>
            <td>{transaction.transaction_date}</td>
            <td>{transaction.transaction_type === 'deposit' ? 'Deposit' : 'Disbursement'}</td>
            <td>
              {transaction.transaction_type === 'disbursement' ? '−' : '+'}
              {currencyFormatter.format(Number(transaction.amount))}
            </td>
            <td>{transaction.description ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
