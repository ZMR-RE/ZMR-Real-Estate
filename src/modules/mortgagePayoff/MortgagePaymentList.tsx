import type { MortgagePayment } from './mortgagePayoffQueries'

interface MortgagePaymentListProps {
  payments: MortgagePayment[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function MortgagePaymentList({ payments }: MortgagePaymentListProps) {
  if (payments.length === 0) {
    return <p>No payments logged yet.</p>
  }

  return (
    <table className="mortgage-payment-list">
      <thead>
        <tr>
          <th>Date</th>
          <th>Amount</th>
          <th>Principal</th>
          <th>Interest</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment) => (
          <tr key={payment.id}>
            <td>{payment.payment_date}</td>
            <td>{currencyFormatter.format(Number(payment.amount))}</td>
            <td>{currencyFormatter.format(Number(payment.principal_amount))}</td>
            <td>{currencyFormatter.format(Number(payment.interest_amount))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
