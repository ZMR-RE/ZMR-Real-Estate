import type { PropertyTaxInstallment } from './propertyTaxQueries'

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

function InstallmentCell({
  amount,
  paidDate,
  document,
  onViewDocument,
}: {
  amount: string | null
  paidDate: string | null
  document: PropertyTaxInstallment['installment_1_document']
  onViewDocument: (path: string) => void
}) {
  return (
    <td>
      {amount ? currencyFormatter.format(Number(amount)) : '—'}
      {paidDate ? ` · paid ${paidDate}` : ''}
      {document && (
        <>
          {' · '}
          <button type="button" onClick={() => onViewDocument(document.storage_path)}>
            View document
          </button>
        </>
      )}
    </td>
  )
}

export function PropertyTaxLedgerList({ installments, onEdit, onViewDocument }: PropertyTaxLedgerListProps) {
  if (installments.length === 0) {
    return <p>No tax years recorded yet.</p>
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
              document={installment.installment_1_document}
              onViewDocument={onViewDocument}
            />
            <InstallmentCell
              amount={installment.installment_2_amount}
              paidDate={installment.installment_2_paid_date}
              document={installment.installment_2_document}
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
