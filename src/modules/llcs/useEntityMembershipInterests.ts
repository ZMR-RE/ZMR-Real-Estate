import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  getLlcMembershipSummary,
  getLlcMembershipVersion,
  interpretOwnershipError,
  listLlcMembershipInterests,
  replaceLlcMembershipInterests,
  type AllocationStatus,
  type LlcMembershipInterest,
  type OwnershipCompleteness,
  type OwnershipEntryInput,
} from './ownershipInterestsQueries'

// Entity Membership box logic — the parallel of usePropertyOwnershipInterests
// for "who is a member of this entity, and what share" (kept fully
// separate from property title per the explicit instruction not to
// conflate the two). Same shared-function, same-reason, same-completeness
// contract as the property side.
export function useEntityMembershipInterests(llcId: string) {
  const { accountId } = useAuth()
  const [members, setMembers] = useState<LlcMembershipInterest[]>([])
  const [version, setVersion] = useState(0)
  const [completeness, setCompleteness] = useState<OwnershipCompleteness>('none')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const [{ data, error: fetchError }, currentVersion, { data: summary }] = await Promise.all([
      listLlcMembershipInterests(accountId, llcId),
      getLlcMembershipVersion(llcId),
      getLlcMembershipSummary(accountId, llcId),
    ])
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setMembers(data ?? [])
    setVersion(currentVersion)
    setCompleteness(summary?.completeness ?? 'none')
  }, [accountId, llcId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = async (entries: OwnershipEntryInput[], reason: string, allocationStatus: AllocationStatus) => {
    setSaving(true)
    const { error: saveError } = await replaceLlcMembershipInterests(llcId, entries, reason, version, allocationStatus)
    setSaving(false)

    if (saveError) {
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

  return { members, version, completeness, loading, error, saving, save, refresh }
}
