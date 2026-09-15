import type { MortgageEscrowTransaction } from './mortgagePayoffQueries'

interface EscrowTransactionListProps {
  transactions: MortgageEscrowTransaction[]
  onVoid: (id: string) => void
  voiding: boolean
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function EscrowTransactionList({ transactions, onVoid, voiding }: EscrowTransactionListProps) {
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
          <th></th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((transaction) => (
          <tr key={transaction.id} style={transaction.voided ? { opacity: 0.5 } : undefined}>
            <td>{transaction.transaction_date}</td>
            <td>
              {transaction.transaction_type === 'deposit' ? 'Deposit' : 'Disbursement'}
              {transaction.voided ? ' (voided)' : ''}
            </td>
            <td>
              {transaction.transaction_type === 'disbursement' ? '−' : '+'}
              {currencyFormatter.format(Number(transaction.amount))}
            </td>
            <td>{transaction.description ?? '—'}</td>
            <td>
              {!transaction.voided && (
                <button type="button" onClick={() => onVoid(transaction.id)} disabled={voiding}>
                  Void
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
