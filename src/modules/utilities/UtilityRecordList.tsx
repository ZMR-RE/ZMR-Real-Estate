import { UtilityRecordForm } from './UtilityRecordForm'
import type { UtilityRecord, UtilityRecordInput } from './utilitiesQueries'

interface UtilityRecordListProps {
  records: UtilityRecord[]
  editingId: string | null
  saving: boolean
  onStartEditing: (id: string) => void
  onSave: (id: string, input: UtilityRecordInput) => void
  onCancel: () => void
}

export function UtilityRecordList({
  records,
  editingId,
  saving,
  onStartEditing,
  onSave,
  onCancel,
}: UtilityRecordListProps) {
  if (records.length === 0) {
    return <p className="empty-state">No utility records logged yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Utility</th>
          <th>Responsibility</th>
          <th>Notes</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) =>
          editingId === record.id ? (
            <tr key={record.id}>
              <td colSpan={4}>
                <UtilityRecordForm
                  initialValues={{
                    utility_type: record.utility_type,
                    responsibility: record.responsibility,
                    notes: record.notes,
                  }}
                  saving={saving}
                  onSave={(input) => onSave(record.id, input)}
                  onCancel={onCancel}
                />
              </td>
            </tr>
          ) : (
            <tr key={record.id}>
              <td>{record.utility_type}</td>
              <td>{record.responsibility}</td>
              <td>{record.notes ?? ''}</td>
              <td>
                <button type="button" onClick={() => onStartEditing(record.id)}>
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
