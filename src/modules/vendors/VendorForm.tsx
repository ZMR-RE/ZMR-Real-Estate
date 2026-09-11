import { useState } from 'react'
import type { VendorInput } from './vendorsQueries'

interface VendorFormProps {
  saving: boolean
  error: string | null
  onSave: (input: VendorInput) => void
  onCancel: () => void
}

const BLANK_VENDOR: VendorInput = {
  name: '',
  contact_email: null,
  contact_phone: null,
  has_w9: false,
  has_insurance: false,
}

// A plain div, not a <form> — this renders inside TransactionForm's own
// <form>, and HTML forms can't nest without invalid markup and a submit
// that bubbles into the outer form. Mirrors LlcForm's inline-create shape.
export function VendorForm({ saving, error, onSave, onCancel }: VendorFormProps) {
  const [values, setValues] = useState<VendorInput>(BLANK_VENDOR)

  return (
    <div className="inline-form">
      {error && <p role="alert">{error}</p>}

      <label htmlFor="vendor_form_name">Vendor name</label>
      <input
        id="vendor_form_name"
        required
        value={values.name}
        onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
      />

      <label htmlFor="vendor_form_contact_email">Contact email</label>
      <input
        id="vendor_form_contact_email"
        type="email"
        value={values.contact_email ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, contact_email: e.target.value || null }))}
      />

      <label htmlFor="vendor_form_contact_phone">Contact phone</label>
      <input
        id="vendor_form_contact_phone"
        value={values.contact_phone ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, contact_phone: e.target.value || null }))}
      />

      <label htmlFor="vendor_form_has_w9">
        <input
          id="vendor_form_has_w9"
          type="checkbox"
          checked={values.has_w9}
          onChange={(e) => setValues((prev) => ({ ...prev, has_w9: e.target.checked }))}
        />
        W9 on file
      </label>

      <label htmlFor="vendor_form_has_insurance">
        <input
          id="vendor_form_has_insurance"
          type="checkbox"
          checked={values.has_insurance}
          onChange={(e) => setValues((prev) => ({ ...prev, has_insurance: e.target.checked }))}
        />
        Insurance on file
      </label>

      <button type="button" disabled={saving || !values.name.trim()} onClick={() => onSave(values)}>
        {saving ? 'Adding…' : 'Add vendor'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
