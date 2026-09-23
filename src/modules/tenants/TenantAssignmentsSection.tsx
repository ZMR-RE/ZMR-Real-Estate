import { useTenantAssignments } from './useTenantAssignments'
import { TenantAssignmentForm } from './TenantAssignmentForm'
import { TenantAssignmentList } from './TenantAssignmentList'
import { EditableSection } from '../../shared/EditableSection'

interface TenantAssignmentsSectionProps {
  unitId: string
}

// Roadmap 8.4 — tenant history for one unit. Deliberately not a single
// FK on the unit: every past and current assignment lists here, so a
// unit's tenant history survives turnover instead of being overwritten,
// and a tenant record (tenants table) persists independent of any
// current unit assignment.
//
// Roadmap 7.28 — converted to the Box interaction standard's
// EditableSection, owning its own box (title, chevron, Edit) rather
// than being wrapped by the caller's own CollapsibleSection — same fix
// as Utility records (7.25) and Leasing/listing history above. View
// state shows a read-only list (no Archive/Restore action, no standing
// "+ Assign tenant" button); both only appear once this box's own Edit
// is clicked.
export function TenantAssignmentsSection({ unitId }: TenantAssignmentsSectionProps) {
  const {
    assignments,
    loading,
    error,
    isAdding,
    saving,
    tenantOptions,
    addTenant,
    startAdding,
    cancelAdding,
    add,
    toggleArchived,
    todayDateString,
  } = useTenantAssignments(unitId)

  return (
    <EditableSection
      title="Tenants"
      onEditStart={cancelAdding}
      view={
        <>
          {error && <p role="alert">{error}</p>}
          {loading ? (
            <p>Loading…</p>
          ) : (
            <TenantAssignmentList assignments={assignments} readOnly onToggleArchived={() => {}} />
          )}
        </>
      }
      edit={(exitEditing) => (
        <>
          {error && <p role="alert">{error}</p>}
          {loading ? (
            <p>Loading…</p>
          ) : (
            <TenantAssignmentList assignments={assignments} onToggleArchived={toggleArchived} />
          )}

          {isAdding ? (
            <TenantAssignmentForm
              tenantOptions={tenantOptions}
              onCreateTenant={addTenant}
              saving={saving}
              todayDateString={todayDateString}
              onSave={add}
              onCancel={cancelAdding}
            />
          ) : (
            <button type="button" onClick={startAdding}>
              + Assign tenant
            </button>
          )}

          <button type="button" onClick={exitEditing}>
            Done
          </button>
        </>
      )}
    />
  )
}
