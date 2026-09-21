import { useState } from 'react'
import type { ProspectiveTenantInput } from './prospectiveTenantsQueries'

interface ProspectiveTenantFormProps {
  saving: boolean
  error: string | null
  onSave: (input: ProspectiveTenantInput) => void
  onCancel: () => void
}

const BLANK_PROSPECTIVE_TENANT: ProspectiveTenantInput = { name: '' }

// A plain div, not a <form> — mirrors VendorForm's inline-create shape.
// Renders inside Quick Capture's own <form>, from Visit's "who was met
// with" picker's "+ Add potential tenant".
export function ProspectiveTenantForm({ saving, error, onSave, onCancel }: ProspectiveTenantFormProps) {
  const [values, setValues] = useState<ProspectiveTenantInput>(BLANK_PROSPECTIVE_TENANT)

  return (
    <div className="inline-form">
      {error && <p role="alert">{error}</p>}

      <label htmlFor="prospective_tenant_form_name">
        Name<span className="required-marker">*</span>
      </label>
      <input
        id="prospective_tenant_form_name"
        required
        value={values.name}
        onChange={(e) => setValues({ name: e.target.value })}
      />

      <button type="button" disabled={saving || !values.name.trim()} onClick={() => onSave(values)}>
        {saving ? 'Adding…' : 'Add potential tenant'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
