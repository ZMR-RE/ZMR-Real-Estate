import { LeaseForm } from '../leases/LeaseForm'
import { formatRent, leaseFormInitial, shortLeaseId } from '../leases/leaseFormLogic'
import { UnfinishedTenancyChoice } from '../leases/UnfinishedTenancyChoice'
import { TenancyKindChoice } from './TenancyKindChoice'
import { useAddTenancy, type AddedTenant } from './useAddTenancy'

interface AddTenancyFormProps {
  propertyId: string
  onSaved: (tenants: AddedTenant[], unitLabel: string) => void
  onCancel: () => void
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

// The Tenants box's Edit state: choose a unit of this property; if it has an
// unfinished or current tenancy, choose what you're adding; then the existing
// lease form (existing or new tenant, co-tenants, dates, rent).
export function AddTenancyForm({ propertyId, onSaved, onCancel }: AddTenancyFormProps) {
  const a = useAddTenancy(propertyId)
  const unit = a.units.find((u) => u.id === a.unitId)
  const unitLabel = unit?.unit_label ?? ''
  const choice = a.choice

  if (!a.unitsLoaded) return <p>Loading…</p>

  if (a.units.length === 0) {
    return (
      <div className="inline-form">
        <p className="empty-state">This property has no units yet — add one in Units below, then add the tenant here.</p>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    )
  }

  const onlyCurrent = a.currentOnUnit
  const resumeOrNewLease = choice?.kind === 'resume' ? choice.lease : null
  const coTenantLease = choice?.kind === 'cotenant' ? choice.lease : null
  const alreadyOn = new Set(coTenantLease?.tenants.map((t) => t.id) ?? [])
  const canChange = a.pendingLeaseId === null && (a.unfinished.length > 0 || onlyCurrent.length > 0)

  return (
    <div className="inline-form">
      <label htmlFor={`add-tenancy-unit-${propertyId}`}>
        Unit<span className="required-marker">*</span>
      </label>
      <select
        id={`add-tenancy-unit-${propertyId}`}
        value={a.unitId}
        disabled={a.pendingLeaseId !== null}
        onChange={(e) => a.setUnitId(e.target.value)}
      >
        <option value="">Choose a unit…</option>
        {a.units.map((u) => (
          <option key={u.id} value={u.id}>{u.unit_label}</option>
        ))}
      </select>
      {a.unitId && !a.leasesLoaded && <p>Loading…</p>}

      {a.needsUnfinishedChoice && (
        <UnfinishedTenancyChoice
          leases={a.unfinished}
          onResume={(lease) => a.choose({ kind: 'resume', lease })}
          onStartNew={a.skipUnfinished}
        />
      )}
      {a.needsKindChoice && (
        <TenancyKindChoice
          unitLabel={unitLabel}
          currentLeases={onlyCurrent}
          onCoTenant={(lease) => a.choose({ kind: 'cotenant', lease })}
          onSeparate={() => a.choose({ kind: 'new' })}
        />
      )}

      {choice && (
        <p className="field-hint">
          {resumeOrNewLease && <>Finishing tenancy ID {shortLeaseId(resumeOrNewLease.id)}: choose its tenant(s) and Save. No second tenancy is created.</>}
          {coTenantLease && (
            <>
              Adding co-tenant(s) to {coTenantLease.tenants.map((t) => t.name).join(' & ')}’s tenancy. Its {formatRent(coTenantLease.rent_amount)} rent, dates and
              fees stay as they are.
            </>
          )}
          {choice.kind === 'new' && onlyCurrent.length > 0 && <>A separate tenancy with its own rent, counted in addition to the current one.</>}{' '}
          {canChange && (
            <button type="button" onClick={a.changeChoice}>
              Change
            </button>
          )}
        </p>
      )}

      {a.error && <p role="alert">{a.error}</p>}
      {a.unitId && choice && (
        <LeaseForm
          key={`${a.unitId}:${choice.kind}:${resumeOrNewLease?.id ?? coTenantLease?.id ?? ''}`}
          tenantOptions={coTenantLease ? a.tenantOptions.filter((t) => !alreadyOn.has(t.id)) : a.tenantOptions}
          onCreateTenant={a.addTenant}
          saving={a.saving}
          todayDateString={todayDateString()}
          initial={resumeOrNewLease ? leaseFormInitial(resumeOrNewLease) : undefined}
          tenantsOnly={coTenantLease !== null}
          onSave={async (input) => {
            const added = await a.save(input)
            if (added) onSaved(added, unitLabel)
          }}
          onCancel={onCancel}
        />
      )}
      {!(a.unitId && choice) && (
        <button type="button" onClick={onCancel}>Cancel</button>
      )}
    </div>
  )
}
