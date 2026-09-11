import { useCallback, useEffect, useState } from 'react'
import { createVendor, listVendors, type VendorInput } from './vendorsQueries'

export interface VendorOption {
  id: string
  label: string
}

// Mirrors useLlcs's fetch-options-plus-create-new shape (roadmap 8.2) so
// any picker needing a vendor (Transactions today, Tasks later) can reuse
// this instead of re-fetching/re-creating per caller.
export function useVendors(accountId: string | null) {
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([])

  const refresh = useCallback(async () => {
    if (!accountId) return
    const { data } = await listVendors(accountId)
    setVendorOptions((data ?? []).map((v) => ({ id: v.id, label: v.name })))
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addVendor = async (input: VendorInput): Promise<{ id: string } | { error: string }> => {
    if (!accountId) return { error: 'No account selected' }
    const { data, error } = await createVendor(accountId, input)
    if (error || !data) {
      return { error: error?.message ?? 'Could not create vendor' }
    }
    setVendorOptions((prev) =>
      [...prev, { id: data.id, label: data.name }].sort((a, b) => a.label.localeCompare(b.label)),
    )
    return { id: data.id }
  }

  return { vendorOptions, addVendor }
}
