import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useTenants } from '../tenants/useTenants'
import { createLease } from './leaseEntryQueries'
import { unfinishedLeases } from './leaseFormLogic'
import {
  endLease as endLeaseQuery,
  listLeasesForUnit,
  setLeaseArchived,
  updateLease,
  type Lease,
  type LeaseInput,
} from './leasesQueries'
import { ensureLeaseRenewalReminders } from './leaseRenewalReminders'

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
  // this same lease instead of creating another (createLease). Also set when
  // the owner resumes an unfinished tenancy found on this unit.
  const [pendingLeaseId, setPendingLeaseId] = useState<string | null>(null)
  const [resumedLease, setResumedLease] = useState<Lease | null>(null)
  // Starting a separate tenancy while an unfinished one exists is an
  // explicit choice, never the default.
  const [separateChosen, setSeparateChosen] = useState(false)

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
    setResumedLease(null)
    setSeparateChosen(false)
    setIsAdding(true)
  }

  const resume = (lease: Lease) => {
    setResumedLease(lease)
    setPendingLeaseId(lease.id)
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
    setResumedLease(null)
  }

  const add = async (input: LeaseInput) => {
    if (!accountId) return
    setSaving(true)
    const { leaseId, error: saveError } = await createLease(accountId, propertyId, unitId, input, pendingLeaseId)
    setSaving(false)

    if (saveError) {
      setPendingLeaseId(leaseId)
      setError(leaseId ? `${partialLeaseMessage} (${saveError.message})` : saveError.message)
      return
    }
    setPendingLeaseId(null)
    setResumedLease(null)
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const unfinished = unfinishedLeases(leases)
  // Adding on a unit with an unfinished tenancy: resume it or explicitly
  // start a separate one before the form appears.
  const needsUnfinishedChoice = isAdding && unfinished.length > 0 && !resumedLease && !separateChosen && !pendingLeaseId

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
    unfinished,
    needsUnfinishedChoice,
    resumedLease,
    resume,
    chooseSeparate: () => setSeparateChosen(true),
  }
}
