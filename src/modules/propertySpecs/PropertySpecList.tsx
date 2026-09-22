import { PropertySpecForm } from './PropertySpecForm'
import type { Unit } from '../units/unitsQueries'
import type { PropertySpec, PropertySpecInput } from './propertySpecsQueries'

interface PropertySpecListProps {
  specs: PropertySpec[]
  unitOptions: Unit[]
  onRefreshUnitOptions: () => void
  // Box interaction standard: the box's default view state shows plain
  // read-only rows, no per-row Edit.
  readOnly?: boolean
  editingId: string | null
  saving: boolean
  onStartEditing: (id: string) => void
  onSave: (id: string, input: PropertySpecInput) => void
  onCancel: () => void
}

// A spec's unit_id can point at a unit that's since been archived (still
// resolvable here — archive is a soft-delete, per CLAUDE.md, so the row
// stays in unitOptions) or, in principle, one that no longer resolves at
// all (unit_id's FK is ON DELETE SET NULL, not currently reachable from
// any UI action, but guarded against here rather than assumed away).
function scopeLabel(spec: PropertySpec, unitOptions: Unit[]): string {
  if (!spec.unit_id) return 'Whole building'
  const unit = unitOptions.find((u) => u.id === spec.unit_id)
  if (!unit) return 'Unit removed'
  return unit.archived ? `${unit.unit_label} (archived)` : unit.unit_label
}

export function PropertySpecList({
  specs,
  unitOptions,
  onRefreshUnitOptions,
  readOnly = false,
  editingId,
  saving,
  onStartEditing,
  onSave,
  onCancel,
}: PropertySpecListProps) {
  if (specs.length === 0) {
    return <p className="empty-state">No specs logged yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Scope</th>
          <th>Area</th>
          <th>Label</th>
          <th>Value</th>
          <th>Last updated</th>
          {!readOnly && <th></th>}
        </tr>
      </thead>
      <tbody>
        {specs.map((spec) =>
          !readOnly && editingId === spec.id ? (
            <tr key={spec.id}>
              <td colSpan={6}>
                <PropertySpecForm
                  initialValues={{
                    unitId: spec.unit_id,
                    area: spec.area ?? '',
                    label: spec.label,
                    value: spec.value,
                  }}
                  unitOptions={unitOptions}
                  onRefreshUnitOptions={onRefreshUnitOptions}
                  saving={saving}
                  onSave={(input) => onSave(spec.id, input)}
                  onCancel={onCancel}
                />
              </td>
            </tr>
          ) : (
            <tr key={spec.id}>
              <td>{scopeLabel(spec, unitOptions)}</td>
              <td>{spec.area ?? '—'}</td>
              <td>{spec.label}</td>
              <td>{spec.value}</td>
              <td>{new Date(spec.updated_at).toLocaleString()}</td>
              {!readOnly && (
                <td>
                  <button type="button" onClick={() => onStartEditing(spec.id)}>
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ),
        )}
      </tbody>
    </table>
  )
}
