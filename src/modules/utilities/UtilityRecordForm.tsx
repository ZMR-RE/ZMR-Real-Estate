import { useState, type FormEvent } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import type { UtilityRecordInput, UtilityResponsibility } from './utilitiesQueries'

interface UtilityRecordFormProps {
  initialValues: UtilityRecordInput
  saving: boolean
  onSave: (input: UtilityRecordInput) => void
  onCancel: () => void
}

const RESPONSIBILITY_OPTIONS: UtilityResponsibility[] = ['Owner', 'Tenant', 'Split']

export function UtilityRecordForm({ initialValues, saving, onSave, onCancel }: UtilityRecordFormProps) {
  const [values, setValues] = useState<UtilityRecordInput>(initialValues)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <PickListSelect
        id="utility_type"
        listName="utility_type"
        title="Utility type"
        value={values.utility_type}
        onChange={(utility_type) => setValues((prev) => ({ ...prev, utility_type }))}
        placeholder="Select utility type…"
        required
      />

      <label htmlFor="utility_responsibility">Responsibility</label>
      <select
        id="utility_responsibility"
        value={values.responsibility}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, responsibility: e.target.value as UtilityResponsibility }))
        }
      >
        {RESPONSIBILITY_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <label htmlFor="utility_notes">Notes</label>
      <textarea
        id="utility_notes"
        value={values.notes ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value || null }))}
      />

      <button type="submit" disabled={saving || !values.utility_type}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
