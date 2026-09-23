import { useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { UnitForm } from './UnitForm'
import type { Unit, UnitInput } from './unitsQueries'
import { LeasingListingSection } from '../leasingListings/LeasingListingSection'
import { LeaseHistorySection } from '../leases/LeaseHistorySection'
import { LeaseForm } from '../leases/LeaseForm'
import { EndLeaseForm } from '../leases/LeaseList'
import { useLeases } from '../leases/useLeases'
import { getLeaseStatus } from '../leases/leasesQueries'
import { getSecurityDepositForLease } from '../securityDeposits/securityDepositsQueries'
import { UtilityRecordsSection } from '../utilities/UtilityRecordsSection'

interface UnitCardProps {
  propertyId: string
  unit: Unit
  // Roadmap "Units/Lease/Tenant rebuild" item 5 — hides unit_label
  // entirely when this is the property's only (active) unit; the
  // address alone identifies it. Computed by the caller (UnitsSection)
  // from the full units list, not here — a single card doesn't know how
  // many sibling units exist.
  isSingleUnit: boolean
  interactive: boolean
  unitFormEditing: boolean
  saving: boolean
  onStartEditingUnit: (id: string) => void
  onSaveUnit: (id: string, input: UnitInput) => void
  onCancelUnitForm: () => void
  onToggleUnitArchived: (unit: Unit) => void
}

const rentFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

// One unit's own card — label/status/at-a-glance lease info plus its
// nested Leasing listing/Lease history/Utility records subsections.
// Roadmap "Units/Lease/Tenant rebuild" item 1: "each unit card shows
// Status, current tenant(s), current rent, lease end date at a glance
// — no click required." Own useLeases call per card (a real React
// component instance per unit, not an inline .map() callback) — the
// only way each unit gets independent lease CRUD state without
// breaking the rules of hooks.
export function UnitCard({
  propertyId,
  unit,
  isSingleUnit,
  interactive,
  unitFormEditing,
  saving: unitSaving,
  onStartEditingUnit,
  onSaveUnit,
  onCancelUnitForm,
  onToggleUnitArchived,
}: UnitCardProps) {
  const { accountId } = useAuth()
  // Roadmap item 2 — "+ End lease... prompts/links to the Security
  // Deposit return workflow." Set once a lease has just been ended;
  // holds whether an existing deposit was found for it (link to
  // Security deposits) or not (informational only — this doesn't force
  // creating one, since not every lease has a deposit on file).
  const [endedDepositPrompt, setEndedDepositPrompt] = useState<{ hasDeposit: boolean } | null>(null)
  const {
    leases,
    loading: leasesLoading,
    error: leasesError,
    isAdding,
    editingId,
    endingId,
    saving: leaseSaving,
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
  } = useLeases(propertyId, unit.id)

  if (unitFormEditing) {
    return (
      <div className="unit-card">
        <UnitForm
          initialValues={{ unit_label: unit.unit_label, status: unit.status }}
          saving={unitSaving}
          onSave={(input) => onSaveUnit(unit.id, input)}
          onCancel={onCancelUnitForm}
        />
      </div>
    )
  }

  // "current lease(s) at a glance" — active AND not archived (an
  // archived lease is a corrected mistake, same "stops counting as a
  // real current/past tenant anywhere" semantics TenantAssignmentsSection
  // established — getLeaseStatus is purely date-based and doesn't know
  // about archived on its own, so both checks are needed here).
  // Overlapping active leases are allowed (e.g. a brief tenant
  // transition), so this is a list, not a single value.
  const currentLeases = leases.filter((lease) => !lease.archived && getLeaseStatus(lease) === 'active')

  return (
    <div className={`unit-card${unit.archived ? ' row-voided' : ''}`}>
      {!isSingleUnit && <h3>{unit.unit_label}</h3>}
      <p>Status: {unit.status || 'Not set'}</p>
      <span className={`status-badge ${unit.archived ? 'status-badge-neutral' : 'status-badge-success'}`}>
        {unit.archived ? 'Archived' : 'Active'}
      </span>

      {/* Roadmap item 1 — "at a glance, no click required": tenant(s),
          rent, lease end date, straight from the current active
          lease(s), no expansion needed. "$0 — Not set up" (warning
          color) when there's no current lease or its rent isn't on
          file, same convention 7.55 (4) established, rather than the
          line disappearing or reading as blank/nothing-to-see. */}
      {currentLeases.length === 0 ? (
        <p className="unit-rent-value--warning">Rent: $0 — Not set up</p>
      ) : (
        currentLeases.map((lease) => (
          <div key={lease.id} className="unit-current-lease">
            <p>Tenant(s): {lease.tenants.map((t) => t.name).join(', ') || '—'}</p>
            <p className={lease.rent_amount === null ? 'unit-rent-value--warning' : undefined}>
              Rent: {lease.rent_amount !== null ? `${rentFormatter.format(Number(lease.rent_amount))}/mo` : '$0 — Not set up'}
            </p>
            <p>Lease end date: {lease.end_date ?? 'Ongoing'}</p>
          </div>
        ))
      )}

      {interactive && (
        <>
          <button type="button" onClick={() => onStartEditingUnit(unit.id)}>
            Edit
          </button>
          <button type="button" onClick={() => onToggleUnitArchived(unit)}>
            {unit.archived ? 'Restore' : 'Archive'}
          </button>
          {/* Roadmap item 1/2 — "+ Add lease" and "+ End lease" as
              top-level, no-expansion-needed unit-card actions (not
              buried inside the nested Lease history box's own edit
              state, which stays a pure history view + per-row actions
              — see LeaseHistorySection.tsx). Both share this same
              useLeases instance, so acting here and acting from Lease
              history stay in sync automatically. */}
          {!isAdding && endingId === null && (
            <button type="button" onClick={startAdding}>
              + Add lease
            </button>
          )}
          {!isAdding &&
            endingId === null &&
            currentLeases.map((lease) => (
              <button type="button" key={lease.id} onClick={() => startEnding(lease.id)}>
                + End lease{currentLeases.length > 1 ? ` (${lease.tenants.map((t) => t.name).join(', ')})` : ''}
              </button>
            ))}
        </>
      )}

      {interactive && isAdding && (
        <LeaseForm
          tenantOptions={tenantOptions}
          onCreateTenant={addTenant}
          saving={leaseSaving}
          todayDateString={todayDateString}
          onSave={add}
          onCancel={cancelForm}
        />
      )}

      {interactive && endingId !== null && (
        <EndLeaseForm
          saving={leaseSaving}
          todayDateString={todayDateString}
          onSave={async (endDate, endReason) => {
            const leaseId = endingId
            await endLease(leaseId, endDate, endReason)
            if (accountId) {
              const { data } = await getSecurityDepositForLease(accountId, leaseId)
              setEndedDepositPrompt({ hasDeposit: data !== null })
            }
          }}
          onCancel={cancelForm}
        />
      )}

      {interactive && endedDepositPrompt && (
        <p className="unit-end-lease-deposit-prompt">
          {endedDepositPrompt.hasDeposit ? (
            <a
              href="#security-deposits-section"
              onClick={() => {
                const target = document.getElementById('security-deposits-section')
                if (target instanceof HTMLDetailsElement) target.open = true
                setEndedDepositPrompt(null)
              }}
            >
              This lease has a security deposit on file — log its return in Security deposits ↓
            </a>
          ) : (
            <>
              No security deposit on file for this lease.{' '}
              <a
                href="#security-deposits-section"
                onClick={() => {
                  const target = document.getElementById('security-deposits-section')
                  if (target instanceof HTMLDetailsElement) target.open = true
                  setEndedDepositPrompt(null)
                }}
              >
                Go to Security deposits ↓
              </a>
            </>
          )}
        </p>
      )}

      <div className="unit-subsections-grid">
        <LeasingListingSection propertyId={propertyId} unitId={unit.id} />
        <LeaseHistorySection
          leases={leases}
          loading={leasesLoading}
          error={leasesError}
          editingId={editingId}
          endingId={endingId}
          saving={leaseSaving}
          todayDateString={todayDateString}
          onStartEditing={startEditing}
          onSave={save}
          onCancelForm={cancelForm}
          onStartEnding={startEnding}
          onEndLease={endLease}
          onToggleArchived={toggleArchived}
        />
        <UtilityRecordsSection propertyId={propertyId} unitId={unit.id} />
      </div>
    </div>
  )
}
