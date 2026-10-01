import { LeaseForm } from '../leases/LeaseForm'
import { useAddTenancy, type AddedTenant } from './useAddTenancy'

interface AddTenancyFormProps {
  propertyId: string
  onSaved: (tenants: AddedTenant[], unitLabel: string) => void
  onCancel: () => void
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

// The Tenants box's Edit state: choose a unit of this property, then the
// existing lease form (existing or new tenant, co-tenants, dates, rent).
export function AddTenancyForm({ propertyId, onSaved, onCancel }: AddTenancyFormProps) {
  const a = useAddTenancy(propertyId)
  const unit = a.units.find((u) => u.id === a.unitId)

  if (!a.unitsLoaded) return <p>Loading…</p>

  if (a.units.length === 0) {
    return (
      <div className="inline-form">
        <p className="empty-state">This property has no units yet — add one in Units below, then add the tenant here.</p>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    )
  }

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
      {a.currentOnUnit.length > 0 && (
        <p className="field-hint">
          {unit?.unit_label} already has a current or upcoming tenancy (
          {a.currentOnUnit.map((l) => l.tenants.map((t) => t.name).join(' & ') || 'no tenants linked').join('; ')}
          ). Adding another doesn’t change it — if it has ended, use “+ End lease” in Units. Co-tenants who share one rent go on the same new tenancy below.
        </p>
      )}
      {a.error && <p role="alert">{a.error}</p>}
      {a.unitId && (
        <LeaseForm
          key={a.unitId}
          tenantOptions={a.tenantOptions}
          onCreateTenant={a.addTenant}
          saving={a.saving}
          todayDateString={todayDateString()}
          onSave={async (input) => {
            const added = await a.save(input)
            if (added) onSaved(added, unit?.unit_label ?? '')
          }}
          onCancel={onCancel}
        />
      )}
      {!a.unitId && (
        <button type="button" onClick={onCancel}>Cancel</button>
      )}
    </div>
  )
}
