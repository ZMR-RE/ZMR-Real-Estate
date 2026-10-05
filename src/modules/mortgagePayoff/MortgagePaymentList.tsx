import { usePagedList } from '../mortgageTab/usePagedList'
import { HistoryPager } from '../mortgageTab/HistoryPager'
import { readableDate } from '../mortgageTab/presentationLogic'
import type { MortgagePayment } from './mortgagePayoffQueries'
import { mortgageCurrencyFormatter as currencyFormatter } from './mortgagePayoffFormat'
import { HISTORY_BADGE, listRowNote } from './mortgageHistoryEntry'

interface MortgagePaymentListProps {
  payments: Array<MortgagePayment & { history?: boolean }>  // history: option B entry (no balance effect)
  onVoid: (id: string) => void
  voiding: boolean
}

export function MortgagePaymentList({ payments, onVoid, voiding }: MortgagePaymentListProps) {
  const paged = usePagedList(payments)
  if (payments.length === 0) {
    return <p className="empty-state">No payments logged yet.</p>
  }

  return (
    <div className="mortgage-history-list">
      <table className="mortgage-payment-list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Principal</th>
            <th>Interest</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {paged.items.map((payment) => (
            <tr key={payment.id} className={payment.voided ? 'row-voided' : undefined}>
              <td data-label="Date">
                {readableDate(payment.payment_date)}
                {payment.voided ? ' (voided)' : ''}
                {payment.history && !payment.voided && (
                  <>
                    {' '}
                    <span className="status-badge status-badge-neutral">{HISTORY_BADGE}</span>
                  </>
                )}
                {listRowNote(payment) && <span className="table-row-note">{listRowNote(payment)}</span>}
              </td>
              <td data-label="Total">{currencyFormatter.format(Number(payment.amount))}</td>
              <td data-label="Principal">{currencyFormatter.format(Number(payment.principal_amount))}</td>
              <td data-label="Interest">{currencyFormatter.format(Number(payment.interest_amount))}</td>
              <td data-label="Actions">
                {!payment.voided && (
                  <button type="button" onClick={() => onVoid(payment.id)} disabled={voiding}>
                    Void
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <HistoryPager {...paged} noun="payments" />
    </div>
  )
}
