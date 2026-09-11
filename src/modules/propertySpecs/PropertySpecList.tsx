import { PropertySpecForm } from './PropertySpecForm'
import type { PropertySpec, PropertySpecInput } from './propertySpecsQueries'

interface PropertySpecListProps {
  specs: PropertySpec[]
  editingId: string | null
  saving: boolean
  onStartEditing: (id: string) => void
  onSave: (id: string, input: PropertySpecInput) => void
  onCancel: () => void
}

export function PropertySpecList({
  specs,
  editingId,
  saving,
  onStartEditing,
  onSave,
  onCancel,
}: PropertySpecListProps) {
  if (specs.length === 0) {
    return <p>No specs logged yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th>Value</th>
          <th>Last updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {specs.map((spec) =>
          editingId === spec.id ? (
            <tr key={spec.id}>
              <td colSpan={4}>
                <PropertySpecForm
                  initialValues={{ label: spec.label, value: spec.value }}
                  saving={saving}
                  onSave={(input) => onSave(spec.id, input)}
                  onCancel={onCancel}
                />
              </td>
            </tr>
          ) : (
            <tr key={spec.id}>
              <td>{spec.label}</td>
              <td>{spec.value}</td>
              <td>{new Date(spec.updated_at).toLocaleString()}</td>
              <td>
                <button type="button" onClick={() => onStartEditing(spec.id)}>
                  Edit
                </button>
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  )
}
