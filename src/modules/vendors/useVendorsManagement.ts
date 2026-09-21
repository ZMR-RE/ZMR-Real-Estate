import { useCallback, useEffect, useState } from 'react'
import { createVendor, listVendors, setVendorArchived, updateVendor, type Vendor, type VendorInput } from './vendorsQueries'

// Roadmap 1.17 — the management view behind Settings' "Vendors" section:
// full list (including archived, unlike useVendors.ts's picker-only
// options), plus add/archive/restore. Kept separate from useVendors.ts
// the same way useOrganizationTypes.ts is kept separate from useLlcs.ts
// — that hook's job is strictly "options for a picker", this one owns
// the admin CRUD surface. Roadmap 1.28 revision added edit (Relationship/
// Notes need to be reachable after creation too), mirroring
// useOrganizationTypes.ts's add/edit/archive/restore shape.
export function useVendorsManagement(accountId: string | null) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
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

  const startAdding = () => {
    setError(null)
    setEditingId(null)
    setIsAdding(true)
  }

  const startEditing = (id: string) => {
    setError(null)
    setIsAdding(false)
    setEditingId(id)
  }

  const cancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setError(null)
  }

  const add = async (input: VendorInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await createVendor(accountId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const save = async (id: string, input: VendorInput) => {
    setSaving(true)
    const { error: saveError } = await updateVendor(id, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setEditingId(null)
    await refresh()
  }

  const toggleArchived = async (vendor: Vendor) => {
    setSaving(true)
    const { error: saveError } = await setVendorArchived(vendor.id, !vendor.archived)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return {
    vendors,
    loading,
    error,
    isAdding,
    editingId,
    saving,
    startAdding,
    startEditing,
    cancelForm,
    add,
    save,
    toggleArchived,
  }
}
