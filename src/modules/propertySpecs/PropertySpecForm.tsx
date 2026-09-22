import { useState, type FormEvent } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import type { Unit } from '../units/unitsQueries'
import type { PropertySpecInput } from './propertySpecsQueries'

interface PropertySpecFormProps {
  initialValues: PropertySpecInput
  unitOptions: Unit[]
  onRefreshUnitOptions: () => void
  saving: boolean
  onSave: (input: PropertySpecInput) => void
  onCancel: () => void
}

// Scope has no "unselected" state to guard against — the empty option is
// "Whole building" itself, a fully valid choice, not a placeholder — so
// unlike Label/Value below it gets no required-marker/required attribute.
export function PropertySpecForm({
  initialValues,
  unitOptions,
  onRefreshUnitOptions,
  saving,
  onSave,
  onCancel,
}: PropertySpecFormProps) {
  const [values, setValues] = useState<PropertySpecInput>(initialValues)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="spec_scope">Scope</label>
      <select
        id="spec_scope"
        value={values.unitId ?? ''}
        onFocus={onRefreshUnitOptions}
        onChange={(e) => setValues((prev) => ({ ...prev, unitId: e.target.value || null }))}
      >
        <option value="">Whole building</option>
        {unitOptions.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.unit_label}
            {unit.archived ? ' (archived)' : ''}
          </option>
        ))}
      </select>

      <label htmlFor="spec_area">Area</label>
      <PickListSelect
        id="spec_area"
        listName="property_spec_area"
        title="Areas"
        value={values.area}
        onChange={(value) => setValues((prev) => ({ ...prev, area: value }))}
        placeholder="Select area…"
      />

      <label htmlFor="spec_label">
        Label<span className="required-marker">*</span>
      </label>
      <input
        id="spec_label"
        required
        placeholder="e.g. Door width, upstairs bathroom"
        value={values.label}
        onChange={(e) => setValues((prev) => ({ ...prev, label: e.target.value }))}
      />

      <label htmlFor="spec_value">
        Value<span className="required-marker">*</span>
      </label>
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
