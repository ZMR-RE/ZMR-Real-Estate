import { useCallback, useEffect, useState } from 'react'
import { formatDateOnly } from '../../shared/dateFormat'
import { tenantDetail } from '../leases/leaseFormLogic'
import { createTenant, listTenants, type Tenant, type TenantInput } from './tenantsQueries'

export interface TenantOption {
  id: string
  label: string
  // Contact details and date added — shown to tell same-name people apart.
  detail: string
}

const toOption = (t: Tenant): TenantOption => ({ id: t.id, label: t.name, detail: tenantDetail(t, formatDateOnly) })

// Mirrors useLlcs/useVendors's fetch-options-plus-create-new shape so any
// picker needing a tenant (unit assignments today) can reuse this.
export function useTenants(accountId: string | null) {
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([])

  const refresh = useCallback(async () => {
    if (!accountId) return
    const { data } = await listTenants(accountId)
    setTenantOptions((data ?? []).map(toOption))
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
      [...prev, toOption(data as Tenant)].sort((a, b) => a.label.localeCompare(b.label)),
    )
    return { id: data.id }
  }

  return { tenantOptions, addTenant }
}
