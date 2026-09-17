import { useCallback, useEffect, useState } from 'react'
import { createLlc, listLlcs, setLlcArchived, updateLlc, type Llc, type LlcInput } from './llcsQueries'

// Roadmap 8.2a/8.2b — the management view behind Settings' "Organization
// types" section: full list (including archived, unlike useLlcs.ts's
// picker-only options), plus add/edit/archive/restore. Kept separate from
// useLlcs.ts since that hook's job is strictly "options for a picker" —
// this one owns the admin CRUD surface.
export function useOrganizationTypes(accountId: string | null) {
  const [llcs, setLlcs] = useState<Llc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listLlcs(accountId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setLlcs(data ?? [])
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

  const add = async (input: LlcInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await createLlc(accountId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const save = async (id: string, input: LlcInput) => {
    setSaving(true)
    const { error: saveError } = await updateLlc(id, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setEditingId(null)
    await refresh()
  }

  const toggleArchived = async (llc: Llc) => {
    setSaving(true)
    const { error: saveError } = await setLlcArchived(llc.id, !llc.archived)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return {
    llcs,
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
