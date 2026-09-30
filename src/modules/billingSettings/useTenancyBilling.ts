import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { termsInputFrom, type TermsFormValues } from './billingSettingsLogic'
import { listTenantTenancies, saveBillingTerms, setBillingRecipient, termsOf, type TenancyRow } from './billingSettingsQueries'

// RP1 — the tenant's tenancies with their billing terms and recipients.
// Saving terms is version-checked: if someone changed them since this box
// loaded, the save is refused and the latest values are shown instead.
export function useTenancyBilling(tenantId: string) {
  const { accountId } = useAuth()
  const [tenancies, setTenancies] = useState<TenancyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    const { data, error: e } = await listTenantTenancies(tenantId)
    setLoading(false)
    if (e) return setError(e.message)
    setTenancies(data ?? [])
  }, [tenantId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Returns true when saved.
  const save = async (tenancy: TenancyRow, values: TermsFormValues, recipients: Record<string, boolean>): Promise<boolean> => {
    if (!accountId) return false
    setSaving(true)
    setError(null)
    const current = termsOf(tenancy)
    const result = await saveBillingTerms(accountId, tenancy.id, current ? current.version : null, termsInputFrom(values))
    if (result.error) {
      setSaving(false)
      setError(
        result.error.code === 'PGRST116' || result.error.code === '23505'
          ? 'These billing terms changed since you opened them. The latest values are shown — review and edit again.'
          : result.error.message,
      )
      await refresh()
      return false
    }
    for (const lt of tenancy.lease_tenants) {
      if (lt.id in recipients && recipients[lt.id] !== lt.is_billing_recipient) {
        const r = await setBillingRecipient(lt.id, recipients[lt.id])
        if (r.error) {
          setSaving(false)
          setError(r.error.message)
          await refresh()
          return false
        }
      }
    }
    setSaving(false)
    await refresh()
    return true
  }

  return { tenancies, loading, error, saving, save }
}
