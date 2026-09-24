import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getLlc, markLlcVerified, updateLlcProfile, type EntityProfileInput, type Llc } from './llcsQueries'

// Entity profile page's business logic — same shape as
// src/modules/tenants/useTenantProfile.ts, the most recent precedent for
// a standalone profile page built on EditableSection.
export function useEntityProfile(entityId: string) {
  const { accountId, session } = useAuth()
  const [entity, setEntity] = useState<Llc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await getLlc(accountId, entityId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setEntity(data)
  }, [accountId, entityId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = async (input: EntityProfileInput) => {
    setSaving(true)
    const { error: saveError } = await updateLlcProfile(entityId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  const markVerified = async () => {
    if (!session) return false
    const { error: verifyError } = await markLlcVerified(entityId, session.user.id)
    if (verifyError) {
      setError(verifyError.message)
      return false
    }
    await refresh()
    return true
  }

  return { entity, loading, error, saving, save, markVerified }
}
