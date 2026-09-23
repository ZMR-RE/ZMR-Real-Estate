import { useLeases } from './useLeases'
import { LeaseForm } from './LeaseForm'
import { LeaseList } from './LeaseList'
import { EditableSection } from '../../shared/EditableSection'

interface LeaseHistorySectionProps {
  propertyId: string
  unitId: string
}

// Replaces TenantAssignmentsSection (roadmap 8.4) — same Box interaction
// standard shape (EditableSection, view-only by default, Edit reveals
// per-row Edit/End lease/Archive plus "+ Add lease"), now backed by the
// real leases/lease_tenants tables instead of tenant_units. "All past
// leases: tenants, dates, rent, why ended" (roadmap item 1) is just
// this list — nothing hidden, archived leases stay visible (dimmed via
// the shared .row-voided class), never hard-deleted.
export function LeaseHistorySection({ propertyId, unitId }: LeaseHistorySectionProps) {
  const {
    leases,
    loading,
    error,
    isAdding,
    editingId,
    endingId,
    saving,
    tenantOptions,
    addTenant,
    startAdding,
    startEditing,
    startEnding,
    cancelForm,
    add,
    save,
    endLease,
    toggleArchived,
    todayDateString,
  } = useLeases(propertyId, unitId)

  return (
    <EditableSection
      title="Lease history"
      onEditStart={cancelForm}
      view={
        <>
          {error && <p role="alert">{error}</p>}
          {loading ? <p>Loading…</p> : <LeaseList leases={leases} readOnly />}
        </>
      }
      edit={(exitEditing) => (
        <>
          {error && <p role="alert">{error}</p>}
          {loading ? (
            <p>Loading…</p>
          ) : (
            <LeaseList
              leases={leases}
              editingId={editingId}
              endingId={endingId}
              saving={saving}
              todayDateString={todayDateString}
              onStartEditing={startEditing}
              onSave={save}
              onCancelEdit={cancelForm}
              onStartEnding={startEnding}
              onEndLease={endLease}
              onCancelEnd={cancelForm}
              onToggleArchived={toggleArchived}
            />
          )}

          {isAdding ? (
            <LeaseForm
              tenantOptions={tenantOptions}
              onCreateTenant={addTenant}
              saving={saving}
              todayDateString={todayDateString}
              onSave={add}
              onCancel={cancelForm}
            />
          ) : (
            <button type="button" onClick={startAdding}>
              + Add lease
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
