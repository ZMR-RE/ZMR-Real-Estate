import { LeaseForm } from '../leases/LeaseForm'
import { leaseFormForChoice } from '../leases/leaseFormLogic'
import { TenancyChoicePanel } from '../leases/TenancyChoicePanel'
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
// unfinished or current tenancy, choose what you're adding (the same choice
// as Units › + Add lease); then the lease form.
export function AddTenancyForm({ propertyId, onSaved, onCancel }: AddTenancyFormProps) {
  const a = useAddTenancy(propertyId)
  const unitLabel = a.units.find((u) => u.id === a.unitId)?.unit_label ?? ''
  const choice = a.tc.choice

  if (!a.unitsLoaded) return <p>Loading…</p>

  if (a.units.length === 0) {
    return (
      <div className="inline-form">
        <p className="empty-state">This property has no units yet — add one in Units below, then add the tenant here.</p>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    )
  }

  const form = a.unitId && choice ? leaseFormForChoice(choice, a.tenantOptions) : null

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
      {a.unitId && <TenancyChoicePanel tc={a.tc} unitLabel={unitLabel} />}

      {a.error && <p role="alert">{a.error}</p>}
      {form && (
        <LeaseForm
          key={`${a.unitId}:${form.key}`}
          tenantOptions={form.tenantOptions}
          onCreateTenant={a.addTenant}
          saving={a.saving}
          todayDateString={todayDateString()}
          initial={form.initial}
          tenantsOnly={form.tenantsOnly}
          onSave={async (input) => {
            const added = await a.save(input)
            if (added) onSaved(added, unitLabel)
          }}
          onCancel={onCancel}
        />
      )}
      {!form && (
        <button type="button" onClick={onCancel}>Cancel</button>
      )}
    </div>
  )
}
