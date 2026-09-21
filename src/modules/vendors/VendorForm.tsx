import { useState } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import type { VendorInput } from './vendorsQueries'

interface VendorFormProps {
  initialValues?: VendorInput
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
  relationship: null,
  notes: null,
}

// A plain div, not a <form> — this renders inside TransactionForm's own
// <form>, and HTML forms can't nest without invalid markup and a submit
// that bubbles into the outer form. Mirrors LlcForm's inline-create/edit
// shape (initialValues present = editing, omitted = adding) — reused for
// both VendorsSection's admin add/edit and the inline "+ Add new vendor"
// quick-create from a picker (Receipt's Vendor field, Visit's "who was
// met with").
export function VendorForm({ initialValues, saving, error, onSave, onCancel }: VendorFormProps) {
  const [values, setValues] = useState<VendorInput>(initialValues ?? BLANK_VENDOR)
  const isEditing = initialValues !== undefined

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

      <label htmlFor="vendor_form_relationship">Relationship</label>
      <PickListSelect
        id="vendor_form_relationship"
        listName="vendor_relationship"
        title="Vendor relationships"
        value={values.relationship ?? ''}
        onChange={(v) => setValues((prev) => ({ ...prev, relationship: v || null }))}
        placeholder="Select relationship…"
      />

      <label htmlFor="vendor_form_notes">Notes</label>
      <textarea
        id="vendor_form_notes"
        value={values.notes ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value || null }))}
      />

      <button type="button" disabled={saving || !values.name.trim()} onClick={() => onSave(values)}>
        {saving ? 'Saving…' : isEditing ? 'Save' : 'Add vendor'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
