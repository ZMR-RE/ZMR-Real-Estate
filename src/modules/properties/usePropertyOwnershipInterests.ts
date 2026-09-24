import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  getPropertyOwnershipSummary,
  getPropertyOwnershipVersion,
  interpretOwnershipError,
  listPropertyOwnershipInterests,
  replacePropertyOwnershipInterests,
  type AllocationStatus,
  type OwnershipCompleteness,
  type OwnershipEntryInput,
  type PropertyOwnershipInterest,
} from '../llcs/ownershipInterestsQueries'

// O1-A ownership foundation — business logic for a property's Ownership
// box. Every mutation goes through replacePropertyOwnershipInterests
// (the sole write path into property_ownership_interests, enforced by
// RLS — see ownershipInterestsQueries.ts's own comment), passing the
// FULL desired current-owner set plus a required reason each time. There
// is no separate "quick add" that skips the reason.
export function usePropertyOwnershipInterests(propertyId: string) {
  const { accountId } = useAuth()
  const [interests, setInterests] = useState<PropertyOwnershipInterest[]>([])
  const [version, setVersion] = useState(0)
  const [completeness, setCompleteness] = useState<OwnershipCompleteness>('none')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const [{ data, error: fetchError }, currentVersion, { data: summary }] = await Promise.all([
      listPropertyOwnershipInterests(accountId, propertyId),
      getPropertyOwnershipVersion(propertyId),
      getPropertyOwnershipSummary(accountId, propertyId),
    ])
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setInterests(data ?? [])
    setVersion(currentVersion)
    // completeness is explicit, server-stored state (never inferred
    // client-side from whether percentages happen to sum to 100) — see
    // ownershipInterestsQueries.ts's OwnershipCompleteness comment.
    setCompleteness(summary?.completeness ?? 'none')
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = async (entries: OwnershipEntryInput[], reason: string, allocationStatus: AllocationStatus) => {
    setSaving(true)
    const { error: saveError } = await replacePropertyOwnershipInterests(propertyId, entries, reason, version, allocationStatus)
    setSaving(false)

    if (saveError) {
      // A stale-version rejection specifically means someone else's edit
      // landed first — refresh so the next attempt is against the real
      // current state rather than repeating a doomed retry.
      const interpreted = interpretOwnershipError(saveError)
      setError(interpreted.message)
      if (interpreted.kind === 'stale') {
        await refresh()
      }
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  return { interests, version, completeness, loading, error, saving, save, refresh }
}
