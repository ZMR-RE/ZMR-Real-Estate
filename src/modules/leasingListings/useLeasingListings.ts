import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createLeasingListing,
  listLeasingListings,
  updateLeasingListing,
  type LeasingListing,
  type LeasingListingInput,
} from './leasingListingsQueries'

export function useLeasingListings(propertyId: string, unitId: string) {
  const { accountId } = useAuth()
  const [listings, setListings] = useState<LeasingListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listLeasingListings(accountId, unitId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setListings(data ?? [])
  }, [accountId, unitId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startAdding = () => {
    setEditingId(null)
    setIsAdding(true)
  }

  const startEditing = (id: string) => {
    setIsAdding(false)
    setEditingId(id)
  }

  const cancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
  }

  const add = async (input: LeasingListingInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await createLeasingListing(accountId, propertyId, unitId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const save = async (id: string, input: LeasingListingInput) => {
    setSaving(true)
    const { error: saveError } = await updateLeasingListing(id, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setEditingId(null)
    await refresh()
  }

  return {
    listings,
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
  }
}
