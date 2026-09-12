import { useCallback, useEffect, useState } from 'react'
import { createTenant, listTenants, type TenantInput } from './tenantsQueries'

export interface TenantOption {
  id: string
  label: string
}

// Mirrors useLlcs/useVendors's fetch-options-plus-create-new shape so any
// picker needing a tenant (unit assignments today) can reuse this.
export function useTenants(accountId: string | null) {
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([])

  const refresh = useCallback(async () => {
    if (!accountId) return
    const { data } = await listTenants(accountId)
    setTenantOptions((data ?? []).map((t) => ({ id: t.id, label: t.name })))
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addTenant = async (input: TenantInput): Promise<{ id: string } | { error: string }> => {
    if (!accountId) return { error: 'No account selected' }
    const { data, error } = await createTenant(accountId, input)
    if (error || !data) {
      return { error: error?.message ?? 'Could not create tenant' }
    }
    setTenantOptions((prev) =>
      [...prev, { id: data.id, label: data.name }].sort((a, b) => a.label.localeCompare(b.label)),
    )
    return { id: data.id }
  }

  return { tenantOptions, addTenant }
}
