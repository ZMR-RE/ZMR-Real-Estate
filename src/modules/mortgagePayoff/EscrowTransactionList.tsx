import type { MortgageEscrowTransaction } from './mortgagePayoffQueries'
import { voidedRowNote } from './mortgageBalanceIntegrity'
import { historyRowNote } from './mortgageHistoryEntry'
import { mortgageCurrencyFormatter as currencyFormatter } from './mortgagePayoffFormat'

interface EscrowTransactionListProps {
  transactions: Array<MortgageEscrowTransaction & { history?: boolean }>  // history: option B entry (no balance effect)
  onVoid: (id: string) => void
  voiding: boolean
}

export function EscrowTransactionList({ transactions, onVoid, voiding }: EscrowTransactionListProps) {
  if (transactions.length === 0) {
    return <p className="empty-state">No escrow transactions logged yet.</p>
  }

  return (
    <div className="table-scroll">
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
            <tr key={transaction.id} className={transaction.voided ? 'row-voided' : undefined}>
              <td>{transaction.transaction_date}</td>
              <td>
                {transaction.transaction_type === 'deposit' ? 'Deposit' : 'Disbursement'}
                {transaction.voided ? ' (voided)' : ''}
                {transaction.history && <span className="field-hint"> {historyRowNote(transaction.voided)}</span>}
                {!transaction.history && transaction.voided && voidedRowNote(transaction.void_outcome) && (
                  <span className="field-hint"> {voidedRowNote(transaction.void_outcome)}</span>
                )}
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
    </div>
  )
}
