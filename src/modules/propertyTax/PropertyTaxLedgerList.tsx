import type { PropertyTaxInstallment, TaxInstallmentDocument } from './propertyTaxQueries'

interface PropertyTaxLedgerListProps {
  installments: PropertyTaxInstallment[]
  onEdit: (id: string) => void
  onViewDocument: (path: string) => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

// Property tax installment display restructure — each installment used
// to render as one run-on inline line (amount · paid date · View
// document), which read as visual clutter once a second/third document
// got added. Stacked into a labeled block instead: Amount / Paid date /
// Documents, each on its own line.
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
      <div className="property-tax-installment-block">
        <div className="property-tax-installment-row">
          <span className="property-tax-installment-label">Amount</span>
          <span>{amount ? currencyFormatter.format(Number(amount)) : '—'}</span>
        </div>
        <div className="property-tax-installment-row">
          <span className="property-tax-installment-label">Paid date</span>
          <span>{paidDate ?? '—'}</span>
        </div>
        <div className="property-tax-installment-row">
          <span className="property-tax-installment-label">Documents</span>
          {documents.length === 0 ? (
            <span>—</span>
          ) : (
            <span className="property-tax-installment-documents-inline">
              {documents.map((doc, i) => (
                <button key={doc.id} type="button" onClick={() => onViewDocument(doc.storage_path)}>
                  {documents.length > 1 ? `View document ${i + 1}` : 'View document'}
                </button>
              ))}
            </span>
          )}
        </div>
      </div>
    </td>
  )
}

export function PropertyTaxLedgerList({ installments, onEdit, onViewDocument }: PropertyTaxLedgerListProps) {
  if (installments.length === 0) {
    return <p className="empty-state">No tax years recorded yet.</p>
  }

  return (
    <table className="property-tax-ledger">
      <thead>
        <tr>
          <th>Year</th>
          <th>1st installment</th>
          <th>2nd installment</th>
          <th></th>
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
            <td>
              <button type="button" onClick={() => onEdit(installment.id)}>
                Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
