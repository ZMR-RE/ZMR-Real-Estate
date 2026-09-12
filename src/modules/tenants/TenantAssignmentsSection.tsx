import { useTenantAssignments } from './useTenantAssignments'
import { TenantAssignmentForm } from './TenantAssignmentForm'
import { TenantAssignmentList } from './TenantAssignmentList'

interface TenantAssignmentsSectionProps {
  unitId: string
  title: string
}

// Roadmap 8.4 — tenant history for one unit. Deliberately not a single
// FK on the unit: every past and current assignment lists here, so a
// unit's tenant history survives turnover instead of being overwritten,
// and a tenant record (tenants table) persists independent of any
// current unit assignment.
export function TenantAssignmentsSection({ unitId, title }: TenantAssignmentsSectionProps) {
  const { assignments, loading, error, isAdding, saving, tenantOptions, addTenant, startAdding, cancelAdding, add, todayDateString } =
    useTenantAssignments(unitId)

  return (
    <section>
      <h4>{title}</h4>
      {error && <p role="alert">{error}</p>}

      {loading ? <p>Loading…</p> : <TenantAssignmentList assignments={assignments} />}

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
    </section>
  )
}
