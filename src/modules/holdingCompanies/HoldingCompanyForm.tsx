import { useState } from 'react'
import type { HoldingCompanyInput } from './holdingCompaniesQueries'

interface HoldingCompanyFormProps {
  saving: boolean
  error: string | null
  onSave: (input: HoldingCompanyInput) => void
  onCancel: () => void
}

const BLANK_HOLDING_COMPANY: HoldingCompanyInput = {
  name: '',
}

// A plain div, not a <form> — this renders inside LlcForm's own inline
// form, which itself renders inside PropertyForm's <form>, and HTML
// forms can't nest. Mirrors LlcForm/VendorForm's inline-create shape.
export function HoldingCompanyForm({ saving, error, onSave, onCancel }: HoldingCompanyFormProps) {
  const [values, setValues] = useState<HoldingCompanyInput>(BLANK_HOLDING_COMPANY)

  return (
    <div className="inline-form">
      {error && <p role="alert">{error}</p>}

      <label htmlFor="holding_company_form_name">
        Holding Company name<span className="required-marker">*</span>
      </label>
      <input
        id="holding_company_form_name"
        required
        value={values.name}
        onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
      />

      <button type="button" disabled={saving || !values.name.trim()} onClick={() => onSave(values)}>
        {saving ? 'Adding…' : 'Add Holding Company'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
