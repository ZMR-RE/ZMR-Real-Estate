import { useState } from 'react'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES, type ChartAccountInput } from './chartOfAccountsQueries'

interface AccountFormProps {
  initialValues: ChartAccountInput
  saving: boolean
  isNew: boolean
  onSave: (input: ChartAccountInput) => void
  onCancel: () => void
}

export function AccountForm({ initialValues, saving, isNew, onSave, onCancel }: AccountFormProps) {
  const [values, setValues] = useState<ChartAccountInput>(initialValues)

  return (
    <div className="inline-form">
      <label htmlFor="account_form_type">Bucket</label>
      <select
        id="account_form_type"
        value={values.type}
        onChange={(e) => setValues((prev) => ({ ...prev, type: e.target.value as ChartAccountInput['type'] }))}
      >
        {ACCOUNT_TYPES.map((type) => (
          <option key={type} value={type}>
            {ACCOUNT_TYPE_LABELS[type]}
          </option>
        ))}
      </select>

      <label htmlFor="account_form_name">Account name</label>
      <input
        id="account_form_name"
        required
        value={values.name}
        onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
      />

      <label htmlFor="account_form_description">Description</label>
      <input
        id="account_form_description"
        value={values.description ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value || null }))}
      />

      <button type="button" disabled={saving || !values.name.trim()} onClick={() => onSave(values)}>
        {saving ? 'Saving…' : isNew ? 'Add account' : 'Save account'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
