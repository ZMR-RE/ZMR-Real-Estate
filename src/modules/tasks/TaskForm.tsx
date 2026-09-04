import { useState, type FormEvent } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { SearchableSelect } from '../../shared/SearchableSelect'
import type { RecurrenceInterval, TaskInput } from './tasksQueries'

interface TaskFormProps {
  initialValues: TaskInput
  propertyOptions: SearchableSelectOption[]
  saving: boolean
  onSave: (input: TaskInput) => void
  onCancel: () => void
}

const RECURRENCE_OPTIONS: { value: RecurrenceInterval; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export function TaskForm({ initialValues, propertyOptions, saving, onSave, onCancel }: TaskFormProps) {
  const [values, setValues] = useState<TaskInput>(initialValues)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="property_id">Property</label>
      <SearchableSelect
        options={propertyOptions}
        value={values.property_id || null}
        onChange={(id) => setValues((prev) => ({ ...prev, property_id: id }))}
        placeholder="Select a property"
      />

      <label htmlFor="title">Title</label>
      <input
        id="title"
        required
        value={values.title}
        onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))}
      />

      <label htmlFor="notes">Notes</label>
      <input
        id="notes"
        value={values.notes ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value || null }))}
      />

      <label htmlFor="due_date">Due date</label>
      <input
        id="due_date"
        type="date"
        required
        value={values.due_date}
        onChange={(e) => setValues((prev) => ({ ...prev, due_date: e.target.value }))}
      />

      <label htmlFor="recurrence">Repeats</label>
      <select
        id="recurrence"
        value={values.recurrence}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, recurrence: e.target.value as RecurrenceInterval }))
        }
      >
        {RECURRENCE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button type="submit" disabled={saving || !values.property_id}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
