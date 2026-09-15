import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createUtilityRecord,
  listUtilityRecords,
  updateUtilityRecord,
  type UtilityRecord,
  type UtilityRecordInput,
} from './utilitiesQueries'

export function useUtilityRecords(propertyId: string, unitId: string | null = null) {
  const { accountId } = useAuth()
  const [records, setRecords] = useState<UtilityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listUtilityRecords(accountId, propertyId, unitId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setRecords(data ?? [])
  }, [accountId, propertyId, unitId])

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

  const add = async (input: UtilityRecordInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await createUtilityRecord(accountId, propertyId, unitId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const save = async (id: string, input: UtilityRecordInput) => {
    setSaving(true)
    const { error: saveError } = await updateUtilityRecord(id, input)
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
    records,
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
