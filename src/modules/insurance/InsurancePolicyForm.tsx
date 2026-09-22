import { useState, type FormEvent } from 'react'
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

      <label htmlFor="insurance_contact_info">Contact info</label>
      <input
        id="insurance_contact_info"
        value={values.contact_info}
        onChange={(e) => setValues((prev) => ({ ...prev, contact_info: e.target.value }))}
      />

      <label htmlFor="insurance_coverage_start">Coverage start</label>
      <input
        id="insurance_coverage_start"
        type="date"
        value={values.coverage_start_date}
        onChange={(e) => setValues((prev) => ({ ...prev, coverage_start_date: e.target.value }))}
      />

      <label htmlFor="insurance_coverage_end">Coverage end</label>
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
