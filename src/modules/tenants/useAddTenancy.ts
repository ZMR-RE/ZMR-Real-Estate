import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { createLease, getLeaseStatus, listLeasesForUnit, type Lease, type LeaseInput } from '../leases/leasesQueries'
import { partialLeaseMessage } from '../leases/useLeases'
import { listUnits, type Unit } from '../units/unitsQueries'
import { useTenants } from './useTenants'

export interface AddedTenant {
  id: string
  name: string
}

// Property Overview › Tenants › Add tenant: the same tenancy the Units box's
// "+ Add lease" creates (one lease, one or more tenants, the same createLease
// and LeaseForm), started from the property instead of from a unit. Choose a
// unit of THIS property, then the tenant(s), dates and rent.
export function useAddTenancy(propertyId: string) {
  const { accountId } = useAuth()
  const { tenantOptions, addTenant } = useTenants(accountId)
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [unitId, setUnitId] = useState('')
  const [unitLeases, setUnitLeases] = useState<{ unitId: string; leases: Lease[] }>({ unitId: '', leases: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set when a lease saved but its tenant links failed; the next Save
  // finishes that lease instead of creating another, so the unit is fixed.
  const [pendingLeaseId, setPendingLeaseId] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    listUnits(accountId, propertyId).then(({ data, error: e }) => {
      if (e) return setError(e.message)
      const active = (data ?? []).filter((u) => !u.archived)
      setUnits(active)
      // One unit: choose it. Several: the owner chooses explicitly.
      if (active.length === 1) setUnitId(active[0].id)
    })
  }, [accountId, propertyId])

  // Existing tenancies on the chosen unit are shown, never changed.
  useEffect(() => {
    if (!accountId || !unitId) return
    listLeasesForUnit(accountId, unitId).then(({ data }) => setUnitLeases({ unitId, leases: data ?? [] }))
  }, [accountId, unitId])

  const leasesForUnit = unitLeases.unitId === unitId ? unitLeases.leases : []
  const currentOnUnit = leasesForUnit.filter((l) => !l.archived && getLeaseStatus(l) !== 'ended')

  const save = useCallback(
    async (input: LeaseInput): Promise<AddedTenant[] | null> => {
      if (!accountId || !unitId) return null
      setSaving(true)
      const { leaseId, error: e } = await createLease(accountId, propertyId, unitId, input, pendingLeaseId)
      setSaving(false)
      if (e) {
        setPendingLeaseId(leaseId)
        setError(leaseId ? `${partialLeaseMessage} (${e.message})` : e.message)
        return null
      }
      setPendingLeaseId(null)
      setError(null)
      return input.tenantIds.map((id) => ({ id, name: tenantOptions.find((t) => t.id === id)?.label ?? 'Tenant' }))
    },
    [accountId, propertyId, unitId, pendingLeaseId, tenantOptions],
  )

  return { units: units ?? [], unitsLoaded: units !== null, unitId, setUnitId, currentOnUnit, tenantOptions, addTenant, saving, error, pendingLeaseId, save }
}
