import { UtilityRecordForm } from './UtilityRecordForm'
import type { UtilityRecord, UtilityRecordInput } from './utilitiesQueries'

interface UtilityRecordListProps {
  records: UtilityRecord[]
  // Box interaction standard: the box's default view state shows plain
  // read-only rows, no per-row Edit.
  readOnly?: boolean
  editingId: string | null
  saving: boolean
  onStartEditing: (id: string) => void
  onSave: (id: string, input: UtilityRecordInput) => void
  onCancel: () => void
}

export function UtilityRecordList({
  records,
  readOnly = false,
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
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Utility</th>
            <th>Responsibility</th>
            <th>Provider name</th>
            <th>Provider contact</th>
            <th>Notes</th>
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {records.map((record) =>
            !readOnly && editingId === record.id ? (
              <tr key={record.id}>
                <td colSpan={6}>
                  <UtilityRecordForm
                    initialValues={{
                      utility_type: record.utility_type,
                      responsibility: record.responsibility,
                      notes: record.notes,
                      provider_name: record.provider_name,
                      provider_contact: record.provider_contact,
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
                <td>{record.provider_name ?? ''}</td>
                <td>{record.provider_contact ?? ''}</td>
                <td>{record.notes ?? ''}</td>
                {!readOnly && (
                  <td>
                    <button type="button" onClick={() => onStartEditing(record.id)}>
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}
