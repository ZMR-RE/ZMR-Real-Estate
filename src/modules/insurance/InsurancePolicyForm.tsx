import { useState, type FormEvent } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import type { InsurancePolicyDocument } from './insuranceQueries'
import type { InsurancePolicyFormValues } from './useInsuranceLedger'

interface InsurancePolicyFormProps {
  initialValues: InsurancePolicyFormValues
  existingDocuments: InsurancePolicyDocument[]
  saving: boolean
  error: string | null
  onSave: (values: InsurancePolicyFormValues, files: File[]) => void
  onCancel: () => void
  onViewDocument: (path: string) => void
}

// Same pattern as Property Tax's InstallmentDocuments (9.5 revision) —
// existingDocuments is whatever's already attached; the file input here
// only ever ADDS more on top, never replaces.
function PolicyDocuments({
  documents,
  onViewDocument,
}: {
  documents: InsurancePolicyDocument[]
  onViewDocument: (path: string) => void
}) {
  if (documents.length === 0) return null

  return (
    <ul className="insurance-policy-documents">
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

export function InsurancePolicyForm({
  initialValues,
  existingDocuments,
  saving,
  error,
  onSave,
  onCancel,
  onViewDocument,
}: InsurancePolicyFormProps) {
  const [values, setValues] = useState<InsurancePolicyFormValues>(initialValues)
  const [files, setFiles] = useState<File[]>([])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values, files)
  }

  return (
    <form className="insurance-policy-form" onSubmit={handleSubmit}>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="insurance_provider">
        Provider<span className="required-marker">*</span>
      </label>
      <input
        id="insurance_provider"
        required
        value={values.provider}
        onChange={(e) => setValues((prev) => ({ ...prev, provider: e.target.value }))}
      />

      <label htmlFor="insurance_policy_number">Policy #</label>
      <input
        id="insurance_policy_number"
        value={values.policy_number}
        onChange={(e) => setValues((prev) => ({ ...prev, policy_number: e.target.value }))}
      />

      <label htmlFor="insurance_named_insured">Named insured</label>
      <input
        id="insurance_named_insured"
        value={values.named_insured}
        onChange={(e) => setValues((prev) => ({ ...prev, named_insured: e.target.value }))}
      />

      <label htmlFor="insurance_coverage_start">Effective date</label>
      <input
        id="insurance_coverage_start"
        type="date"
        value={values.coverage_start_date}
        onChange={(e) => setValues((prev) => ({ ...prev, coverage_start_date: e.target.value }))}
      />

      <label htmlFor="insurance_coverage_end">Expiration date</label>
      <input
        id="insurance_coverage_end"
        type="date"
        value={values.coverage_end_date}
        onChange={(e) => setValues((prev) => ({ ...prev, coverage_end_date: e.target.value }))}
      />

      <label htmlFor="insurance_premium">Premium amount ($)</label>
      <input
        id="insurance_premium"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={values.premium_amount}
        onChange={(e) => setValues((prev) => ({ ...prev, premium_amount: e.target.value }))}
      />

      <label htmlFor="insurance_deductible">Deductible ($)</label>
      <input
        id="insurance_deductible"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={values.deductible}
        onChange={(e) => setValues((prev) => ({ ...prev, deductible: e.target.value }))}
      />

      <label htmlFor="insurance_representative_name">Representative name</label>
      <input
        id="insurance_representative_name"
        value={values.representative_name}
        onChange={(e) => setValues((prev) => ({ ...prev, representative_name: e.target.value }))}
      />

      <label htmlFor="insurance_representative_phone">Representative phone</label>
      <input
        id="insurance_representative_phone"
        type="tel"
        value={values.representative_phone}
        onChange={(e) => setValues((prev) => ({ ...prev, representative_phone: e.target.value }))}
      />

      <label htmlFor="insurance_representative_email">Representative email</label>
      <input
        id="insurance_representative_email"
        type="email"
        value={values.representative_email}
        onChange={(e) => setValues((prev) => ({ ...prev, representative_email: e.target.value }))}
      />

      <label htmlFor="insurance_payment_plan">Payment plan</label>
      <PickListSelect
        id="insurance_payment_plan"
        listName="insurance_payment_plan"
        title="Payment plan"
        placeholder="Select a payment plan…"
        value={values.payment_plan}
        onChange={(payment_plan) => setValues((prev) => ({ ...prev, payment_plan }))}
      />

      <label htmlFor="insurance_policy_discounts">Policy discounts</label>
      <input
        id="insurance_policy_discounts"
        value={values.policy_discounts}
        onChange={(e) => setValues((prev) => ({ ...prev, policy_discounts: e.target.value }))}
      />

      <label htmlFor="insurance_documents">Documents</label>
      <PolicyDocuments documents={existingDocuments} onViewDocument={onViewDocument} />
      <input
        id="insurance_documents"
        type="file"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
