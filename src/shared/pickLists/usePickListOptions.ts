import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { addOption, listOptions, setOptionActive, type PickListName, type PickListOption } from './pickListsQueries'

export function usePickListOptions(listName: PickListName) {
  const { accountId } = useAuth()
  const [options, setOptions] = useState<PickListOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listOptions(accountId, listName)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setOptions(data ?? [])
  }, [accountId, listName])

  useEffect(() => {
    refresh()
  }, [refresh])

  const activeOptions = options.filter((o) => o.active)

  const add = async (value: string) => {
    if (!accountId || !value.trim()) return
    setSaving(true)
    const { error: saveError } = await addOption(accountId, listName, value)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  const archive = async (id: string) => {
    setSaving(true)
    const { error: saveError } = await setOptionActive(id, false)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  const restore = async (id: string) => {
    setSaving(true)
    const { error: saveError } = await setOptionActive(id, true)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return { options, activeOptions, loading, error, saving, add, archive, restore }
}
