import { useState, type FormEvent } from 'react'
import type { PropertyValueLogInput } from './propertyValueHistoryQueries'

interface PropertyValueHistoryFormProps {
  idPrefix: string
  initialValues: PropertyValueLogInput
  saving: boolean
  onSave: (input: PropertyValueLogInput) => Promise<boolean>
}

const SOURCE_SUGGESTIONS = ['Zillow', 'Redfin', 'Appraisal', 'Other']

export function PropertyValueHistoryForm({ idPrefix, initialValues, saving, onSave }: PropertyValueHistoryFormProps) {
  const [values, setValues] = useState<PropertyValueLogInput>(initialValues)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const succeeded = await onSave(values)
    if (succeeded) {
      setValues(initialValues)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={`${idPrefix}_entry_date`}>Date</label>
      <input
        id={`${idPrefix}_entry_date`}
        type="date"
        required
        value={values.entry_date}
        onChange={(e) => setValues((prev) => ({ ...prev, entry_date: e.target.value }))}
      />

      <label htmlFor={`${idPrefix}_value`}>Value ($)</label>
      <input
        id={`${idPrefix}_value`}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        required
        value={values.value}
        onChange={(e) => setValues((prev) => ({ ...prev, value: e.target.value }))}
      />

      <label htmlFor={`${idPrefix}_source`}>Source</label>
      <input
        id={`${idPrefix}_source`}
        list={`${idPrefix}_source_options`}
        placeholder="e.g. Zillow, Redfin, Appraisal"
        required
        value={values.source}
        onChange={(e) => setValues((prev) => ({ ...prev, source: e.target.value }))}
      />
      <datalist id={`${idPrefix}_source_options`}>
        {SOURCE_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <button type="submit" disabled={saving}>
        {saving ? 'Logging…' : 'Log entry'}
      </button>
    </form>
  )
}
