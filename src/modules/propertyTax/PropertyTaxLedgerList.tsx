import type { PropertyTaxInstallment, TaxInstallmentDocument } from './propertyTaxQueries'

interface PropertyTaxLedgerListProps {
  installments: PropertyTaxInstallment[]
  // Roadmap 7.25 — Box interaction standard: the box's default view
  // state shows plain read-only labels, no per-row Edit.
  readOnly?: boolean
  onEdit?: (id: string) => void
  onViewDocument: (path: string) => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

// Roadmap 7.37 — compact one-line-per-year redesign: amount and paid
// date collapse into a single "$2,817.34 — 2024-03-31" string, no
// "Amount"/"Paid date" label text (replaces the old 3-row stacked
// block). An amount with no paid date yet (unpaid) shows just the
// amount, no trailing punctuation; a slot with no amount at all shows
// "—", same as the rest of the app's missing-data convention.
function installmentDisplay(amount: string | null, paidDate: string | null): string {
  if (!amount) return '—'
  const formatted = currencyFormatter.format(Number(amount))
  return paidDate ? `${formatted} — ${paidDate}` : formatted
}

function InstallmentCell({
  amount,
  paidDate,
  documents,
  onViewDocument,
}: {
  amount: string | null
  paidDate: string | null
  documents: TaxInstallmentDocument[]
  onViewDocument: (path: string) => void
}) {
  return (
    <td>
      <span>{installmentDisplay(amount, paidDate)}</span>
      {documents.length > 0 && (
        <span className="property-tax-installment-documents-inline">
          {documents.map((doc, i) => (
            <button key={doc.id} type="button" onClick={() => onViewDocument(doc.storage_path)}>
              {documents.length > 1 ? `View document ${i + 1}` : 'View document'}
            </button>
          ))}
        </span>
      )}
    </td>
  )
}

export function PropertyTaxLedgerList({
  installments,
  readOnly = false,
  onEdit,
  onViewDocument,
}: PropertyTaxLedgerListProps) {
  if (installments.length === 0) {
    return <p className="empty-state">No tax years recorded yet — add the first one to start building the history.</p>
  }

  return (
    <div className="table-scroll">
      <table className="property-tax-ledger">
        <thead>
          <tr>
            <th>Year</th>
            <th>1st installment</th>
            <th>2nd installment</th>
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {installments.map((installment) => (
            <tr key={installment.id}>
              <td>{installment.tax_year}</td>
              <InstallmentCell
                amount={installment.installment_1_amount}
                paidDate={installment.installment_1_paid_date}
                documents={installment.documents.filter((d) => d.tax_installment_number === 1)}
                onViewDocument={onViewDocument}
              />
              <InstallmentCell
                amount={installment.installment_2_amount}
                paidDate={installment.installment_2_paid_date}
                documents={installment.documents.filter((d) => d.tax_installment_number === 2)}
                onViewDocument={onViewDocument}
              />
              {!readOnly && (
                <td>
                  <button type="button" onClick={() => onEdit?.(installment.id)}>
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
