import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listProperties } from '../properties/propertiesQueries'
import { getAttachmentSignedUrl, listUnreconciled, markReconciled, type QueueEntry } from './reconciliationQueries'

export function useReconciliationQueue() {
  const { accountId } = useAuth()
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: p.name })))
    })
  }, [accountId])

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listUnreconciled(accountId, propertyFilter)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setEntries(data ?? [])
  }, [accountId, propertyFilter])

  useEffect(() => {
    refresh()
  }, [refresh])

  const reconcile = async (id: string) => {
    setProcessingId(id)
    const { error: reconcileError } = await markReconciled(id)
    setProcessingId(null)

    if (reconcileError) {
      setError(reconcileError.message)
      return
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const viewAttachment = async (path: string) => {
    const { data, error: urlError } = await getAttachmentSignedUrl(path)
    if (urlError || !data) {
      setError(urlError?.message ?? 'Could not load attachment')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  return {
    entries,
    propertyOptions,
    propertyFilter,
    setPropertyFilter,
    loading,
    error,
    processingId,
    reconcile,
    viewAttachment,
  }
}
