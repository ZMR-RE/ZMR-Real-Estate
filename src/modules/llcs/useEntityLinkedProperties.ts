import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  getPropertyOwnershipVersion,
  interpretOwnershipError,
  listLlcOwnedProperties,
  listPropertyOwnershipInterests,
  replacePropertyOwnershipInterests,
} from './ownershipInterestsQueries'

export interface EntityLinkedProperty {
  interest_id: string
  property_id: string
  property_name: string
  property_address: string | null
  percentage: number | null
}

// Entity profile "Linked properties" — this entity's own current title
// interests, replacing the earlier plain-property-list view with one
// that also carries percentage. "Remove this entity's interest" is the
// resolved fix for the Settings reassignment bypass: it fetches the
// target property's OWN full current interest set, drops this entity,
// and calls the exact same replacePropertyOwnershipInterests function
// the property-side Ownership box uses — there is no second write path.
export function useEntityLinkedProperties(llcId: string) {
  const { accountId } = useAuth()
  const [properties, setProperties] = useState<EntityLinkedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listLlcOwnedProperties(accountId, llcId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setProperties(
      (data ?? []).map((row) => {
        const property = row.property as unknown as { id: string; name: string; address: string | null } | null
        return {
          interest_id: row.id,
          property_id: row.property_id,
          property_name: property?.address ?? property?.name ?? 'Unknown property',
          property_address: property?.address ?? null,
          percentage: row.percentage,
        }
      }),
    )
  }, [accountId, llcId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const removeInterest = async (propertyId: string, reason: string) => {
    if (!accountId) return false
    setRemovingId(propertyId)

    const [{ data: currentInterests, error: fetchError }, version] = await Promise.all([
      listPropertyOwnershipInterests(accountId, propertyId),
      getPropertyOwnershipVersion(propertyId),
    ])
    if (fetchError || !currentInterests) {
      setRemovingId(null)
      setError(fetchError?.message ?? 'Could not load current owners')
      return false
    }

    const remainingEntries = currentInterests
      .filter((i) => i.llc_id !== llcId)
      .map((i) => ({ ownerId: i.llc_id, percentage: i.percentage }))

    // Removing an owner from here always leaves the property's allocation
    // marked 'incomplete' — this panel has no way to verify whether the
    // remaining owners still constitute the full, correct picture, so it
    // never re-asserts 'complete' on the property's behalf. The property's
    // own Ownership box can mark it complete again once reviewed.
    const { error: saveError } = await replacePropertyOwnershipInterests(propertyId, remainingEntries, reason, version, 'incomplete')
    setRemovingId(null)

    if (saveError) {
      setError(interpretOwnershipError(saveError).message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  return { properties, loading, error, removingId, removeInterest, refresh }
}
