import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listVendors, updateVendorSplitRule, type Vendor } from './vendorsQueries'

export function useVendorSplitRules() {
  const { accountId } = useAuth()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listVendors(accountId)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setVendors(data ?? [])
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startEditing = (vendorId: string) => setEditingId(vendorId)
  const cancelEditing = () => setEditingId(null)

  const saveSplitRule = async (vendorId: string, splitPercentage: number | null, splitDescription: string | null) => {
    setSaving(true)
    const { error: saveError } = await updateVendorSplitRule(vendorId, { splitPercentage, splitDescription })
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setEditingId(null)
    await refresh()
  }

  const clearSplitRule = async (vendorId: string) => {
    setSaving(true)
    const { error: saveError } = await updateVendorSplitRule(vendorId, { splitPercentage: null, splitDescription: null })
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return { vendors, loading, error, editingId, startEditing, cancelEditing, saving, saveSplitRule, clearSplitRule }
}
