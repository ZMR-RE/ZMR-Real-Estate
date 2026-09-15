import { useState, type FormEvent } from 'react'
import { SearchableSelect, type SearchableSelectOption } from '../../shared/SearchableSelect'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import { useUnitOptionsForProperty } from './useUnitOptionsForProperty'
import type { ActionItemInput, RecurrenceInterval } from './actionItemsQueries'

interface ActionItemFormProps {
  initialValues: ActionItemInput
  propertyOptions: SearchableSelectOption[]
  memberOptions: SearchableSelectOption[]
  saving: boolean
  onSave: (input: ActionItemInput) => void
  onCancel: () => void
}

const NO_PROPERTY_ID = 'account-level'
const NO_UNIT_ID = 'no-unit'
const NO_ASSIGNEE_ID = 'unassigned'

const RECURRENCE_OPTIONS: { value: RecurrenceInterval; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export function ActionItemForm({
  initialValues,
  propertyOptions,
  memberOptions,
  saving,
  onSave,
  onCancel,
}: ActionItemFormProps) {
  const [values, setValues] = useState<ActionItemInput>(initialValues)
  const unitOptions = useUnitOptionsForProperty(values.propertyId)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="action_item_title">Title</label>
      <input
        id="action_item_title"
        required
        value={values.title}
        onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))}
      />

      <label htmlFor="action_item_property">Property</label>
      <SearchableSelect
        options={[{ id: NO_PROPERTY_ID, label: 'Account-level (no property)' }, ...propertyOptions]}
        value={values.propertyId ?? NO_PROPERTY_ID}
        onChange={(id) =>
          setValues((prev) => ({
            ...prev,
            propertyId: id === NO_PROPERTY_ID ? null : id,
            unitId: null,
          }))
        }
        placeholder="Select a property"
      />

      {values.propertyId && (
        <>
          <label htmlFor="action_item_unit">Unit</label>
          <SearchableSelect
            options={[{ id: NO_UNIT_ID, label: 'Whole property (no unit)' }, ...unitOptions]}
            value={values.unitId ?? NO_UNIT_ID}
            onChange={(id) => setValues((prev) => ({ ...prev, unitId: id === NO_UNIT_ID ? null : id }))}
            placeholder="Select a unit"
          />
        </>
      )}

      <label htmlFor="action_item_type">Type</label>
      <PickListSelect
        id="action_item_type"
        listName="task_type"
        title="Action types"
        value={values.type ?? ''}
        onChange={(value) => setValues((prev) => ({ ...prev, type: value || null }))}
      />

      <label htmlFor="action_item_notes">Notes</label>
      <textarea
        id="action_item_notes"
        value={values.notes ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value || null }))}
      />

      <label htmlFor="action_item_assignee">Assignee</label>
      <SearchableSelect
        options={[{ id: NO_ASSIGNEE_ID, label: 'Unassigned' }, ...memberOptions]}
        value={values.assignee ?? NO_ASSIGNEE_ID}
        onChange={(id) => setValues((prev) => ({ ...prev, assignee: id === NO_ASSIGNEE_ID ? null : id }))}
        placeholder="Select an assignee"
      />

      <label htmlFor="action_item_due_date">Due date</label>
      <input
        id="action_item_due_date"
        type="date"
        required
        value={values.dueDate}
        onChange={(e) => setValues((prev) => ({ ...prev, dueDate: e.target.value }))}
      />

      <label htmlFor="action_item_recurrence">Repeats</label>
      <select
        id="action_item_recurrence"
        value={values.recurrence}
        onChange={(e) => setValues((prev) => ({ ...prev, recurrence: e.target.value as RecurrenceInterval }))}
      >
        {RECURRENCE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button type="submit" disabled={saving || !values.title.trim()}>
        {saving ? 'Saving…' : 'Add action item'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
