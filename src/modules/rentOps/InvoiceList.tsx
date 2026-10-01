import '../rentInvoices/invoiceLists.css'
import { formatMoney } from '../rentInvoices/invoiceDocument'
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

  // Same responsive list as Financials' transactions (.transaction-list):
  // text columns and actions wrap inside the box at desktop widths, and in a
  // narrow box each invoice becomes a labelled card, so the number, amount,
  // status and Record payment are always visible without sideways scrolling.
  return (
    <div className="table-scroll transaction-list-container">
      <table className="transaction-list invoice-issued-table">
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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
            const closed = invoice.state === 'superseded' || invoice.state === 'cancelled'
            return (
              <tr key={invoice.id} className={closed ? 'row-voided' : undefined}>
                <td data-label="Number">
                  {invoice.number ? (
                    <button type="button" className="invoice-row-open" onClick={() => onOpen(invoice.id)}>
                      {invoice.number}
                    </button>
                  ) : (
                    <span className="field-hint invoice-list-note">Earlier invoice (unnumbered)</span>
                  )}
                </td>
                <td data-label="Property" className="transaction-list-wrap">{propertyLabel(invoice.property)}</td>
                <td data-label="Billed to" className="transaction-list-wrap">{invoice.billed_to ?? ''}</td>
                <td data-label="Period" className="transaction-list-wrap">
                  <span className="invoice-list-date">{invoice.period_start} –</span> <span className="invoice-list-date">{invoice.period_end}</span>
                </td>
                <td data-label="Amount due" className="transaction-list-amount">{formatMoney(Number(invoice.amount_due))}</td>
                <td data-label="Due date">{invoice.due_date}</td>
                <td data-label="Paid">{formatMoney(totalPaid)}</td>
                <td data-label="Status" className="transaction-list-wrap">{closed ? CLOSED_LABELS[invoice.state as 'superseded' | 'cancelled'] : STATUS_LABELS[invoiceStatus(invoice)]}</td>
                {/* No caption on a closed invoice's empty action cell (empty fields aren't shown). */}
                <td data-label={closed ? undefined : 'Actions'} className="transaction-list-actions">
                  {!closed && (
                    <div className="transaction-list-action-group">
                      <button type="button" onClick={() => onRecordPayment(invoice.id)}>
                        Record payment
                      </button>
                    </div>
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
