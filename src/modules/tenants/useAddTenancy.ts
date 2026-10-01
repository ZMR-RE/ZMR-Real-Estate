import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { addCoTenants, createLease } from '../leases/leaseEntryQueries'
import { unfinishedLeases } from '../leases/leaseFormLogic'
import { getLeaseStatus, listLeasesForUnit, type Lease, type LeaseInput } from '../leases/leasesQueries'
import { partialLeaseMessage } from '../leases/useLeases'
import { listUnits, type Unit } from '../units/unitsQueries'
import { useTenants } from './useTenants'

export interface AddedTenant {
  id: string
  name: string
}

// What the owner is adding, chosen explicitly when the unit already has a
// tenancy (or an unfinished one): a separate tenancy with its own rent,
// co-tenants on an existing tenancy (its rent unchanged), or finishing an
// unfinished tenancy by its ID.
export type TenancyChoice = { kind: 'new' } | { kind: 'resume'; lease: Lease } | { kind: 'cotenant'; lease: Lease }

// Property Overview › Tenants › Add tenant: the same tenancy the Units box's
// "+ Add lease" creates (one lease, one or more tenants, the same createLease
// and LeaseForm), started from the property instead of from a unit. Choose a
// unit of THIS property, then the tenant(s), dates and rent.
export function useAddTenancy(propertyId: string) {
  const { accountId } = useAuth()
  const { tenantOptions, addTenant } = useTenants(accountId)
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [unitId, setUnitIdState] = useState('')
  const [unitLeases, setUnitLeases] = useState<{ unitId: string; leases: Lease[] }>({ unitId: '', leases: [] })
  const [choice, setChoice] = useState<TenancyChoice | null>(null)
  const [unfinishedSkipped, setUnfinishedSkipped] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set when a lease saved but its tenant links failed; the next Save
  // finishes that lease instead of creating another, so the unit is fixed.
  // After Cancel or a reload it's found again as an unfinished tenancy.
  const [pendingLeaseId, setPendingLeaseId] = useState<string | null>(null)

  const setUnitId = (id: string) => {
    setUnitIdState(id)
    setChoice(null)
    setUnfinishedSkipped(false)
  }

  useEffect(() => {
    if (!accountId) return
    listUnits(accountId, propertyId).then(({ data, error: e }) => {
      if (e) return setError(e.message)
      const active = (data ?? []).filter((u) => !u.archived)
      setUnits(active)
      // One unit: choose it. Several: the owner chooses explicitly.
      if (active.length === 1) setUnitIdState(active[0].id)
    })
  }, [accountId, propertyId])

  // Existing tenancies on the chosen unit are read from saved records —
  // shown and offered, never changed without the owner choosing.
  useEffect(() => {
    if (!accountId || !unitId) return
    listLeasesForUnit(accountId, unitId).then(({ data }) => setUnitLeases({ unitId, leases: data ?? [] }))
  }, [accountId, unitId])

  const leasesLoaded = unitId !== '' && unitLeases.unitId === unitId
  const leasesForUnit = leasesLoaded ? unitLeases.leases : []
  const unfinished = unfinishedLeases(leasesForUnit)
  const currentOnUnit = leasesForUnit.filter((l) => !l.archived && l.tenants.length > 0 && getLeaseStatus(l) !== 'ended')
  const open = leasesLoaded && choice === null && pendingLeaseId === null
  const needsUnfinishedChoice = open && unfinished.length > 0 && !unfinishedSkipped
  const needsKindChoice = open && !needsUnfinishedChoice && currentOnUnit.length > 0
  // Nothing to choose between: a plain new tenancy.
  const effectiveChoice: TenancyChoice | null = choice ?? (leasesLoaded && !needsUnfinishedChoice && !needsKindChoice ? { kind: 'new' } : null)

  const skipUnfinished = () => setUnfinishedSkipped(true)
  // Back to the choices (not while a half-saved lease is being finished).
  const changeChoice = () => {
    setChoice(null)
    setUnfinishedSkipped(false)
  }

  const save = async (input: LeaseInput): Promise<AddedTenant[] | null> => {
    if (!accountId || !unitId || !effectiveChoice) return null
    setSaving(true)
    const { error: e, leaseId } =
      effectiveChoice.kind === 'cotenant'
        ? { ...(await addCoTenants(accountId, effectiveChoice.lease.id, input.tenantIds)), leaseId: null }
        : await createLease(accountId, propertyId, unitId, input, pendingLeaseId ?? (effectiveChoice.kind === 'resume' ? effectiveChoice.lease.id : null))
    setSaving(false)
    if (e) {
      setPendingLeaseId(leaseId)
      setError(leaseId ? `${partialLeaseMessage} (${e.message})` : e.message)
      return null
    }
    setPendingLeaseId(null)
    setError(null)
    return input.tenantIds.map((id) => ({ id, name: tenantOptions.find((t) => t.id === id)?.label ?? 'Tenant' }))
  }

  return {
    units: units ?? [],
    unitsLoaded: units !== null,
    unitId,
    setUnitId,
    leasesLoaded,
    unfinished,
    currentOnUnit,
    needsUnfinishedChoice,
    needsKindChoice,
    choice: effectiveChoice,
    choose: setChoice,
    skipUnfinished,
    changeChoice,
    tenantOptions,
    addTenant,
    saving,
    error,
    pendingLeaseId,
    save,
  }
}
