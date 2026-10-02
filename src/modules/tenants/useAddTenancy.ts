import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { saveTenancy } from '../leases/leaseEntryQueries'
import { listLeasesForUnit, type Lease, type LeaseInput } from '../leases/leasesQueries'
import { partialLeaseMessage } from '../leases/useLeases'
import { useTenancyChoice } from '../leases/useTenancyChoice'
import { listUnits, type Unit } from '../units/unitsQueries'
import { useTenants } from './useTenants'

export interface AddedTenant {
  id: string
  name: string
}

// Property Overview › Tenants › Add tenant: the same tenancy the Units box's
// "+ Add lease" creates (one lease, one or more tenants, the same lease form
// and the same tenancy choice), started from the property instead of from a
// unit. Choose a unit of THIS property, then what you're adding.
export function useAddTenancy(propertyId: string) {
  const { accountId } = useAuth()
  const { tenantOptions, addTenant } = useTenants(accountId)
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [unitId, setUnitIdState] = useState('')
  const [unitLeases, setUnitLeases] = useState<{ unitId: string; leases: Lease[] }>({ unitId: '', leases: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set when a lease saved but its tenant links failed; the next Save
  // finishes that lease instead of creating another, so the unit is fixed.
  // After Cancel or a reload it's found again as an unfinished tenancy.
  const [pendingLeaseId, setPendingLeaseId] = useState<string | null>(null)

  const leasesLoaded = unitId !== '' && unitLeases.unitId === unitId
  const tc = useTenancyChoice(leasesLoaded ? unitLeases.leases : [], leasesLoaded, pendingLeaseId)

  const setUnitId = (id: string) => {
    setUnitIdState(id)
    tc.reset()
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

  const save = async (input: LeaseInput): Promise<AddedTenant[] | null> => {
    if (!accountId || !unitId || !tc.choice) return null
    setSaving(true)
    const { error: e, leaseId } = await saveTenancy(accountId, propertyId, unitId, tc.choice, input, pendingLeaseId)
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
    tc,
    tenantOptions,
    addTenant,
    saving,
    error,
    pendingLeaseId,
    save,
  }
}
