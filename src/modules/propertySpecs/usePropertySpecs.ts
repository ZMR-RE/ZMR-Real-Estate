import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createPropertySpec,
  listPropertySpecs,
  updatePropertySpec,
  type PropertySpec,
  type PropertySpecInput,
} from './propertySpecsQueries'

export function usePropertySpecs(propertyId: string) {
  const { accountId } = useAuth()
  const [specs, setSpecs] = useState<PropertySpec[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listPropertySpecs(accountId, propertyId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setSpecs(data ?? [])
  }, [accountId, propertyId])

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

  const add = async (input: PropertySpecInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await createPropertySpec(accountId, propertyId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const save = async (id: string, input: PropertySpecInput) => {
    setSaving(true)
    const { error: saveError } = await updatePropertySpec(id, input)
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
    specs,
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
