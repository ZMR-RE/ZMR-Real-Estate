import { useState, type FormEvent } from 'react'
import type { PropertyTaxInstallment } from './propertyTaxQueries'
import type { TaxInstallmentFiles, TaxInstallmentFormValues } from './usePropertyTaxLedger'

interface PropertyTaxInstallmentFormProps {
  initialValues: TaxInstallmentFormValues
  existingInstallment1Document: PropertyTaxInstallment['installment_1_document']
  existingInstallment2Document: PropertyTaxInstallment['installment_2_document']
  saving: boolean
  error: string | null
  onSave: (values: TaxInstallmentFormValues, files: TaxInstallmentFiles) => void
  onCancel: () => void
  onViewDocument: (path: string) => void
}

export function PropertyTaxInstallmentForm({
  initialValues,
  existingInstallment1Document,
  existingInstallment2Document,
  saving,
  error,
  onSave,
  onCancel,
  onViewDocument,
}: PropertyTaxInstallmentFormProps) {
  const [values, setValues] = useState<TaxInstallmentFormValues>(initialValues)
  const [installment1File, setInstallment1File] = useState<File | null>(null)
  const [installment2File, setInstallment2File] = useState<File | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values, { installment1File, installment2File })
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

        <label htmlFor="installment_1_document">Attached document</label>
        {existingInstallment1Document && (
          <p>
            <button
              type="button"
              onClick={() => onViewDocument(existingInstallment1Document.storage_path)}
            >
              View current document
            </button>
          </p>
        )}
        <input
          id="installment_1_document"
          type="file"
          onChange={(e) => setInstallment1File(e.target.files?.[0] ?? null)}
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

        <label htmlFor="installment_2_document">Attached document</label>
        {existingInstallment2Document && (
          <p>
            <button
              type="button"
              onClick={() => onViewDocument(existingInstallment2Document.storage_path)}
            >
              View current document
            </button>
          </p>
        )}
        <input
          id="installment_2_document"
          type="file"
          onChange={(e) => setInstallment2File(e.target.files?.[0] ?? null)}
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
