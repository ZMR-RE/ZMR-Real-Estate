import { useState, type FormEvent } from 'react'
import type { PropertySpecInput } from './propertySpecsQueries'

interface PropertySpecFormProps {
  initialValues: PropertySpecInput
  saving: boolean
  onSave: (input: PropertySpecInput) => void
  onCancel: () => void
}

export function PropertySpecForm({ initialValues, saving, onSave, onCancel }: PropertySpecFormProps) {
  const [values, setValues] = useState<PropertySpecInput>(initialValues)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="spec_label">Label</label>
      <input
        id="spec_label"
        required
        placeholder="e.g. Door width, upstairs bathroom"
        value={values.label}
        onChange={(e) => setValues((prev) => ({ ...prev, label: e.target.value }))}
      />

      <label htmlFor="spec_value">Value</label>
      <input
        id="spec_value"
        required
        placeholder="e.g. 28 inches"
        value={values.value}
        onChange={(e) => setValues((prev) => ({ ...prev, value: e.target.value }))}
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
