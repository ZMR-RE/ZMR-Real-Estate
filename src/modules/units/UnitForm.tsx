import { useState, type FormEvent } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import type { UnitInput } from './unitsQueries'

interface UnitFormProps {
  initialValues: UnitInput
  saving: boolean
  onSave: (input: UnitInput) => void
  onCancel: () => void
}

export function UnitForm({ initialValues, saving, onSave, onCancel }: UnitFormProps) {
  const [values, setValues] = useState<UnitInput>(initialValues)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="unit_label">Unit #</label>
      <input
        id="unit_label"
        required
        placeholder="e.g. Unit A"
        value={values.unit_label}
        onChange={(e) => setValues((prev) => ({ ...prev, unit_label: e.target.value }))}
      />

      <PickListSelect
        id="unit_status"
        listName="unit_status"
        title="Unit status"
        value={values.status}
        onChange={(status) => setValues((prev) => ({ ...prev, status }))}
        placeholder="Select status…"
        required
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
