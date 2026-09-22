import { useState, type FormEvent } from 'react'
import type { TaxInstallmentDocument } from './propertyTaxQueries'
import type { TaxInstallmentFiles, TaxInstallmentFormValues } from './usePropertyTaxLedger'

interface PropertyTaxInstallmentFormProps {
  initialValues: TaxInstallmentFormValues
  existingInstallment1Documents: TaxInstallmentDocument[]
  existingInstallment2Documents: TaxInstallmentDocument[]
  saving: boolean
  error: string | null
  onSave: (values: TaxInstallmentFormValues, files: TaxInstallmentFiles) => void
  onCancel: () => void
  onViewDocument: (path: string) => void
}

// Roadmap 9.5 revision — each installment can already have any number of
// documents attached (existingInstallmentNDocuments); the file input here
// only ever ADDS more on top, never replaces — "the original bill AND a
// separate payment confirmation" is the explicit case this exists for.
function InstallmentDocuments({
  documents,
  onViewDocument,
}: {
  documents: TaxInstallmentDocument[]
  onViewDocument: (path: string) => void
}) {
  if (documents.length === 0) return null

  return (
    <ul className="property-tax-installment-documents">
      {documents.map((doc) => (
        <li key={doc.id}>
          <button type="button" onClick={() => onViewDocument(doc.storage_path)}>
            View document ({new Date(doc.uploaded_at).toLocaleDateString()})
          </button>
        </li>
      ))}
    </ul>
  )
}

export function PropertyTaxInstallmentForm({
  initialValues,
  existingInstallment1Documents,
  existingInstallment2Documents,
  saving,
  error,
  onSave,
  onCancel,
  onViewDocument,
}: PropertyTaxInstallmentFormProps) {
  const [values, setValues] = useState<TaxInstallmentFormValues>(initialValues)
  const [installment1Files, setInstallment1Files] = useState<File[]>([])
  const [installment2Files, setInstallment2Files] = useState<File[]>([])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values, { installment1Files, installment2Files })
  }

  return (
    <form className="property-tax-installment-form" onSubmit={handleSubmit}>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="tax_year">
        Tax year<span className="required-marker">*</span>
      </label>
      <input
        id="tax_year"
        type="number"
        required
        value={values.tax_year}
        onChange={(e) => setValues((prev) => ({ ...prev, tax_year: e.target.value }))}
      />

      <fieldset>
        <legend>1st installment</legend>

        <label htmlFor="installment_1_amount">Amount ($)</label>
        <input
          id="installment_1_amount"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={values.installment_1_amount}
          onChange={(e) => setValues((prev) => ({ ...prev, installment_1_amount: e.target.value }))}
        />

        <label htmlFor="installment_1_paid_date">Date paid</label>
        <input
          id="installment_1_paid_date"
          type="date"
          value={values.installment_1_paid_date}
          onChange={(e) => setValues((prev) => ({ ...prev, installment_1_paid_date: e.target.value }))}
        />

        <label htmlFor="installment_1_document">Documents</label>
        <InstallmentDocuments documents={existingInstallment1Documents} onViewDocument={onViewDocument} />
        <input
          id="installment_1_document"
          type="file"
          multiple
          onChange={(e) => setInstallment1Files(Array.from(e.target.files ?? []))}
        />
      </fieldset>

      <fieldset>
        <legend>2nd installment</legend>

        <label htmlFor="installment_2_amount">Amount ($)</label>
        <input
          id="installment_2_amount"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={values.installment_2_amount}
          onChange={(e) => setValues((prev) => ({ ...prev, installment_2_amount: e.target.value }))}
        />

        <label htmlFor="installment_2_paid_date">Date paid</label>
        <input
          id="installment_2_paid_date"
          type="date"
          value={values.installment_2_paid_date}
          onChange={(e) => setValues((prev) => ({ ...prev, installment_2_paid_date: e.target.value }))}
        />

        <label htmlFor="installment_2_document">Documents</label>
        <InstallmentDocuments documents={existingInstallment2Documents} onViewDocument={onViewDocument} />
        <input
          id="installment_2_document"
          type="file"
          multiple
          onChange={(e) => setInstallment2Files(Array.from(e.target.files ?? []))}
        />
      </fieldset>

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
