import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getTenant, updateTenant, type Tenant, type TenantInput } from './tenantsQueries'

export function useTenantProfile(tenantId: string) {
  const { accountId } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await getTenant(accountId, tenantId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setTenant(data)
  }, [accountId, tenantId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = async (input: TenantInput) => {
    setSaving(true)
    const { error: saveError } = await updateTenant(tenantId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  return { tenant, loading, error, saving, save }
}
