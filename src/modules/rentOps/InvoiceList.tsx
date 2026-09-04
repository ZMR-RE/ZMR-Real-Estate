import { invoiceStatus } from './useRentOps'
import type { Invoice } from './rentOpsQueries'

const STATUS_LABELS: Record<ReturnType<typeof invoiceStatus>, string> = {
  pending: 'Pending',
  overdue: 'Overdue',
  partial: 'Partial',
  'paid-on-time': 'Paid on time',
  'paid-late': 'Paid late',
}

interface InvoiceListProps {
  invoices: Invoice[]
  onRecordPayment: (invoiceId: string) => void
}

export function InvoiceList({ invoices, onRecordPayment }: InvoiceListProps) {
  if (invoices.length === 0) {
    return <p>No invoices yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Billed to</th>
          <th>Period</th>
          <th>Amount due</th>
          <th>Due date</th>
          <th>Paid</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => {
          const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
          return (
            <tr key={invoice.id}>
              <td>{invoice.property?.name ?? '—'}</td>
              <td>{invoice.billed_to ?? '—'}</td>
              <td>
                {invoice.period_start} – {invoice.period_end}
              </td>
              <td>${Number(invoice.amount_due).toFixed(2)}</td>
              <td>{invoice.due_date}</td>
              <td>${totalPaid.toFixed(2)}</td>
              <td>{STATUS_LABELS[invoiceStatus(invoice)]}</td>
              <td>
                <button type="button" onClick={() => onRecordPayment(invoice.id)}>
                  Record payment
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
