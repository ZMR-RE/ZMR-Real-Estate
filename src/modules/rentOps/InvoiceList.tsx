import { invoiceStatus } from './useRentOps'
import { propertyLabel } from '../../shared/propertyLabel'
import type { Invoice } from './rentOpsQueries'

const STATUS_LABELS: Record<ReturnType<typeof invoiceStatus>, string> = {
  pending: 'Pending',
  overdue: 'Overdue',
  partial: 'Partial',
  'paid-on-time': 'Paid on time',
  'paid-late': 'Paid late',
}

const CLOSED_LABELS: Record<'superseded' | 'cancelled', string> = {
  superseded: 'Superseded by a revision',
  cancelled: 'Cancelled (number kept)',
}

interface InvoiceListProps {
  invoices: Invoice[]
  onRecordPayment: (invoiceId: string) => void
  // Opens a numbered invoice (stored PDF, revise, cancel).
  onOpen: (invoiceId: string) => void
}

export function InvoiceList({ invoices, onRecordPayment, onOpen }: InvoiceListProps) {
  if (invoices.length === 0) {
    return <p className="empty-state">No issued invoices yet.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Number</th>
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
            const closed = invoice.state === 'superseded' || invoice.state === 'cancelled'
            return (
              <tr key={invoice.id} className={closed ? 'row-voided' : undefined}>
                <td>
                  {invoice.number ? (
                    <button type="button" className="invoice-row-open" onClick={() => onOpen(invoice.id)}>
                      {invoice.number}
                    </button>
                  ) : (
                    <span className="field-hint">Earlier invoice (unnumbered)</span>
                  )}
                </td>
                <td>{propertyLabel(invoice.property)}</td>
                <td>{invoice.billed_to ?? ''}</td>
                <td>
                  {invoice.period_start} – {invoice.period_end}
                </td>
                <td>${Number(invoice.amount_due).toFixed(2)}</td>
                <td>{invoice.due_date}</td>
                <td>${totalPaid.toFixed(2)}</td>
                <td>{closed ? CLOSED_LABELS[invoice.state as 'superseded' | 'cancelled'] : STATUS_LABELS[invoiceStatus(invoice)]}</td>
                <td>
                  {!closed && (
                    <button type="button" onClick={() => onRecordPayment(invoice.id)}>
                      Record payment
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
