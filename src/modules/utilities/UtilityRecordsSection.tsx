import { useUtilityRecords } from './useUtilityRecords'
import { UtilityRecordForm } from './UtilityRecordForm'
import { UtilityRecordList } from './UtilityRecordList'
import type { UtilityRecordInput } from './utilitiesQueries'

interface UtilityRecordsSectionProps {
  propertyId: string
  unitId?: string | null
}

const BLANK_RECORD: UtilityRecordInput = { utility_type: '', responsibility: 'Owner', notes: null }

// Roadmap 7.12 — utility records, linked to either the property
// (building-level, unitId null) or one specific unit. Two separate
// instances of this component cover both scopes; they never share a
// listing (see utilitiesQueries.listUtilityRecords).
export function UtilityRecordsSection({ propertyId, unitId = null }: UtilityRecordsSectionProps) {
  const { records, loading, error, isAdding, editingId, saving, startAdding, startEditing, cancelForm, add, save } =
    useUtilityRecords(propertyId, unitId)

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <UtilityRecordList
          records={records}
          editingId={editingId}
          saving={saving}
          onStartEditing={startEditing}
          onSave={save}
          onCancel={cancelForm}
        />
      )}

      {isAdding ? (
        <UtilityRecordForm initialValues={BLANK_RECORD} saving={saving} onSave={add} onCancel={cancelForm} />
      ) : (
        <button type="button" onClick={startAdding}>
          + Add utility record
        </button>
      )}
    </div>
  )
}
