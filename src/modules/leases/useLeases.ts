import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useTenants } from '../tenants/useTenants'
import { saveTenancy } from './leaseEntryQueries'
import { useSingleFlight } from './singleFlight'
import {
  endLease as endLeaseQuery,
  listLeasesForUnit,
  setLeaseArchived,
  updateLease,
  type Lease,
  type LeaseInput,
} from './leasesQueries'
import { ensureLeaseRenewalReminders } from './leaseRenewalReminders'
import { useTenancyChoice } from './useTenancyChoice'

export const partialLeaseMessage = 'The lease was saved, but its tenants weren’t all linked. Save again to finish — it won’t create a second lease.'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

// Same shape as useTenantAssignments (which this replaces) — loading/
// error/isAdding/editingId/saving, add/save/toggleArchived — plus
// isEnding for the new "+ End lease" action (roadmap item 2), which is
// its own short flow (end date + reason), not the same as editing a
// lease's other fields.
export function useLeases(propertyId: string, unitId: string) {
  const { accountId } = useAuth()
  const { tenantOptions, addTenant } = useTenants(accountId)
  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // A lease saved whose tenant links then failed: the next Save retries on
  // this same lease instead of creating another (createLease).
  const [pendingLeaseId, setPendingLeaseIdState] = useState<string | null>(null)
  // The same id, readable immediately by the next Save (state only catches up
  // on the next render), so a retry always finishes this lease.
  const pendingRef = useRef<string | null>(null)
  const setPendingLeaseId = (id: string | null) => {
    pendingRef.current = id
    setPendingLeaseIdState(id)
  }
  // One + Add lease save at a time; after a success, none until the next add.
  const flight = useSingleFlight()
  // "+ Add lease" asks the same question as Tenants › + Add tenant when this
  // unit has an unfinished or current tenancy (resume / co-tenant / separate).
  const tc = useTenancyChoice(leases, !loading, pendingLeaseId)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    // Roadmap "Units/Lease/Tenant rebuild" item 6 — same idempotent
    // check-and-backfill useActionQueue.ts's own refresh() runs, so a
    // renewal reminder also appears promptly when someone's looking at
    // this exact unit's leases, not only when they happen to open
    // Action Queue directly.
    await ensureLeaseRenewalReminders(accountId)
    const { data, error: fetchError } = await listLeasesForUnit(accountId, unitId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setLeases(data ?? [])
  }, [accountId, unitId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startAdding = () => {
    setEditingId(null)
    setEndingId(null)
    tc.reset()
    flight.reset()
    setIsAdding(true)
  }

  const startEditing = (id: string) => {
    setIsAdding(false)
    setEndingId(null)
    setEditingId(id)
  }

  const startEnding = (id: string) => {
    setIsAdding(false)
    setEditingId(null)
    setEndingId(id)
  }

  const cancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setEndingId(null)
    // A half-saved lease isn't forgotten: it's read back as an unfinished
    // tenancy and offered next time.
    if (pendingLeaseId) refresh()
    setPendingLeaseId(null)
    tc.reset()
  }

  const add = async (input: LeaseInput) => {
    const choice = tc.choice
    if (!accountId || !choice) return
    const result = await flight.run(
      async () => {
        setSaving(true)
        try {
          const { leaseId, error: saveError } = await saveTenancy(accountId, propertyId, unitId, choice, input, pendingRef.current)
          if (saveError) {
            setPendingLeaseId(leaseId)
            setError(leaseId ? `${partialLeaseMessage} (${saveError.message})` : saveError.message)
            return false
          }
          setPendingLeaseId(null)
          return true
        } finally {
          setSaving(false)
        }
      },
      (saved) => saved,
    )
    if (!result.ran || !result.value) return
    tc.reset()
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const save = async (id: string, input: Pick<LeaseInput, 'startDate' | 'endDate' | 'rentAmount' | 'lateFee' | 'moveInFee'>) => {
    setSaving(true)
    const { error: saveError } = await updateLease(id, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setEditingId(null)
    await refresh()
  }

  const endLease = async (id: string, endDate: string, endReason: string | null) => {
    setSaving(true)
    const { error: saveError } = await endLeaseQuery(id, endDate, endReason)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setEndingId(null)
    await refresh()
  }

  const toggleArchived = async (lease: Lease) => {
    setSaving(true)
    const { error: saveError } = await setLeaseArchived(lease.id, !lease.archived)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return {
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
    todayDateString: todayDateString(),
    tenancyChoice: tc,
  }
}
