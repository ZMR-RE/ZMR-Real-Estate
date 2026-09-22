import type { MortgagePayment } from './mortgagePayoffQueries'

interface MortgagePaymentListProps {
  payments: MortgagePayment[]
  onVoid: (id: string) => void
  voiding: boolean
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

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
