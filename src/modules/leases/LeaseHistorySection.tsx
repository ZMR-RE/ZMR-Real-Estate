import { LeaseList } from './LeaseList'
import { EditableSection } from '../../shared/EditableSection'
import type { Lease, LeaseInput } from './leasesQueries'

interface LeaseHistorySectionProps {
  leases: Lease[]
  loading: boolean
  error: string | null
  editingId: string | null
  endingId: string | null
  saving: boolean
  todayDateString: string
  onStartEditing: (id: string) => void
  onSave: (id: string, input: Pick<LeaseInput, 'startDate' | 'endDate' | 'rentAmount' | 'lateFee' | 'moveInFee'>) => void
  onCancelForm: () => void
  onStartEnding: (id: string) => void
  onEndLease: (id: string, endDate: string, endReason: string | null) => void
  onToggleArchived: (lease: Lease) => void
}

// Replaces TenantAssignmentsSection (roadmap 8.4) — "all past leases:
// tenants, dates, rent, why ended" (roadmap item 1). Purely a history
// display + per-row Edit/End lease/Archive — no "+ Add lease" of its
// own; that lives at the unit-card level (UnitsSection.tsx) so it's a
// single, top-level "at a glance" action rather than duplicated inside
// this nested box too. Leases/handlers are passed in as props (not
// fetched here) so the unit card and this history box share one
// useLeases call per unit, not two competing fetches of the same data.
export function LeaseHistorySection({
  leases,
  loading,
  error,
  editingId,
  endingId,
  saving,
  todayDateString,
  onStartEditing,
  onSave,
  onCancelForm,
  onStartEnding,
  onEndLease,
  onToggleArchived,
}: LeaseHistorySectionProps) {
  return (
    <EditableSection
      title="Lease history"
      onEditStart={onCancelForm}
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
              onStartEditing={onStartEditing}
              onSave={onSave}
              onCancelEdit={onCancelForm}
              onStartEnding={onStartEnding}
              onEndLease={onEndLease}
              onCancelEnd={onCancelForm}
              onToggleArchived={onToggleArchived}
            />
          )}

          <button type="button" onClick={exitEditing}>
            Done
          </button>
        </>
      )}
    />
  )
}
