import { useState } from 'react'
import type { TenantInput } from './tenantsQueries'

interface TenantFormProps {
  // Roadmap "Units/Lease/Tenant rebuild" item 5 — the Tenant profile
  // page reuses this same form to edit an existing tenant, not just
  // create a new one inline (LeaseForm's "+ Add new tenant"). Same
  // isEditing-from-initialValues convention as LlcForm.tsx.
  initialValues?: TenantInput
  saving: boolean
  error: string | null
  onSave: (input: TenantInput) => void
  onCancel: () => void
}

const BLANK_TENANT: TenantInput = {
  name: '',
  email: null,
  phone: null,
  notes: null,
}

// A plain div, not a <form> — mirrors LlcForm/VendorForm's inline-create
// shape so it can nest inside another form without invalid markup.
export function TenantForm({ initialValues, saving, error, onSave, onCancel }: TenantFormProps) {
  const [values, setValues] = useState<TenantInput>(initialValues ?? BLANK_TENANT)
  const isEditing = initialValues !== undefined

  return (
    <div className="inline-form">
      {error && <p role="alert">{error}</p>}

      <label htmlFor="tenant_form_name">
        Tenant name<span className="required-marker">*</span>
      </label>
      <input
        id="tenant_form_name"
        required
        value={values.name}
        onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
      />

      <label htmlFor="tenant_form_email">Email</label>
      <input
        id="tenant_form_email"
        type="email"
        value={values.email ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value || null }))}
      />

      <label htmlFor="tenant_form_phone">Phone</label>
      <input
        id="tenant_form_phone"
        value={values.phone ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, phone: e.target.value || null }))}
      />

      <label htmlFor="tenant_form_notes">Notes</label>
      <textarea
        id="tenant_form_notes"
        value={values.notes ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value || null }))}
      />

      <button type="button" disabled={saving || !values.name.trim()} onClick={() => onSave(values)}>
        {saving ? 'Saving…' : isEditing ? 'Save' : 'Add tenant'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
