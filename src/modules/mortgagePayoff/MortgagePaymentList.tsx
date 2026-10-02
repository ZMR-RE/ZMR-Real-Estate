import type { MortgagePayment } from './mortgagePayoffQueries'
import { mortgageCurrencyFormatter as currencyFormatter } from './mortgagePayoffFormat'
import { voidedRowNote } from './mortgageBalanceIntegrity'
import { historyRowNote } from './mortgageHistoryEntry'

interface MortgagePaymentListProps {
  payments: Array<MortgagePayment & { history?: boolean }>  // history: option B entry (no balance effect)
  onVoid: (id: string) => void
  voiding: boolean
}

export function MortgagePaymentList({ payments, onVoid, voiding }: MortgagePaymentListProps) {
  if (payments.length === 0) {
    return <p className="empty-state">No payments logged yet.</p>
  }

  return (
    <div className="table-scroll">
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
          {payments.map((payment) => (
            <tr key={payment.id} className={payment.voided ? 'row-voided' : undefined}>
              <td>
                {payment.payment_date}
                {payment.voided ? ' (voided)' : ''}
                {payment.history &&
                  (payment.voided ? (
                    <span className="field-hint"> {historyRowNote(true)}</span>
                  ) : (
                    <>
                      {' '}
                      <span className="status-badge status-badge-neutral">{historyRowNote(false)}</span>
                    </>
                  ))}
                {!payment.history && payment.voided && voidedRowNote(payment.void_outcome) && (
                  <span className="field-hint"> {voidedRowNote(payment.void_outcome)}</span>
                )}
              </td>
              <td>{currencyFormatter.format(Number(payment.amount))}</td>
              <td>{currencyFormatter.format(Number(payment.principal_amount))}</td>
              <td>{currencyFormatter.format(Number(payment.interest_amount))}</td>
              <td>
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
    </div>
  )
}
