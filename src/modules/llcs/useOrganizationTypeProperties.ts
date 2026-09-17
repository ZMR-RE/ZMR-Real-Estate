import { useCallback, useEffect, useState } from 'react'
import { listPropertiesByLlc, updatePropertyLlc, type PropertyForOrganizationType } from '../properties/propertiesQueries'

// Roadmap 8.2c — lazily loaded only while a given Organization type's
// row is expanded in the management view, so the Settings page doesn't
// pay for every entity's property list up front.
export function useOrganizationTypeProperties(accountId: string | null, llcId: string) {
  const [properties, setProperties] = useState<PropertyForOrganizationType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reassigningId, setReassigningId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listPropertiesByLlc(accountId, llcId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setProperties(data ?? [])
  }, [accountId, llcId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const reassign = async (propertyId: string, newLlcId: string | null) => {
    setReassigningId(propertyId)
    const { error: saveError } = await updatePropertyLlc(propertyId, newLlcId)
    setReassigningId(null)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return { properties, loading, error, reassigningId, reassign }
}
