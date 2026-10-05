import { usePagedList } from '../mortgageTab/usePagedList'
import { HistoryPager } from '../mortgageTab/HistoryPager'
import { readableDate } from '../mortgageTab/presentationLogic'
import type { MortgageEscrowTransaction } from './mortgagePayoffQueries'
import { HISTORY_BADGE, listRowNote } from './mortgageHistoryEntry'
import { mortgageCurrencyFormatter as currencyFormatter } from './mortgagePayoffFormat'

interface EscrowTransactionListProps {
  transactions: Array<MortgageEscrowTransaction & { history?: boolean }>  // history: option B entry (no balance effect)
  onVoid: (id: string) => void
  voiding: boolean
}

export function EscrowTransactionList({ transactions, onVoid, voiding }: EscrowTransactionListProps) {
  const paged = usePagedList(transactions)
  if (transactions.length === 0) {
    return <p className="empty-state">No escrow transactions logged yet.</p>
  }

  return (
    <div className="mortgage-history-list">
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
          {paged.items.map((transaction) => (
            <tr key={transaction.id} className={transaction.voided ? 'row-voided' : undefined}>
              <td data-label="Date">{readableDate(transaction.transaction_date)}</td>
              <td data-label="Type">
                {transaction.transaction_type === 'deposit' ? 'Deposit' : 'Disbursement'}
                {transaction.voided ? ' (voided)' : ''}
                {transaction.history && !transaction.voided && (
                  <>
                    {' '}
                    <span className="status-badge status-badge-neutral">{HISTORY_BADGE}</span>
                  </>
                )}
                {listRowNote(transaction) && <span className="table-row-note">{listRowNote(transaction)}</span>}
              </td>
              <td data-label="Amount">
                {transaction.transaction_type === 'disbursement' ? '−' : '+'}
                {currencyFormatter.format(Number(transaction.amount))}
              </td>
              <td data-label="Description">{transaction.description ?? '—'}</td>
              <td data-label="Actions">
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
      <HistoryPager {...paged} noun="entries" />
    </div>
  )
}
