import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { usePickListOptions } from '../../shared/pickLists/usePickListOptions'
import { listProperties } from '../properties/propertiesQueries'
import { moveToDocuments, type DocumentCategory } from '../documents/documentsQueries'
import { getAttachmentSignedUrl, listUnreconciled, markReconciled, type QueueEntry } from './reconciliationQueries'

export function useReconciliationQueue() {
  const { session, accountId } = useAuth()
  const documentTypeOptions = usePickListOptions('document_type')
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [categoryByEntry, setCategoryByEntry] = useState<Record<string, DocumentCategory | ''>>({})

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

  const setCategory = (id: string, category: DocumentCategory | '') => {
    setCategoryByEntry((prev) => ({ ...prev, [id]: category }))
  }

  // Moves the staged attachment into its permanent Documents path and
  // records it in the documents table (roadmap 2.6), then marks the
  // capture_log entry reconciled — in that order, so an entry never gets
  // marked reconciled without its file actually having landed in Documents.
  const reconcile = async (entry: QueueEntry) => {
    const category = categoryByEntry[entry.id]
    if (!category) {
      setError('Choose a document category before reconciling.')
      return
    }
    if (!accountId || !session) return

    setProcessingId(entry.id)

    const fileName = entry.attachment_path.split('/').pop() ?? entry.attachment_path
    const { error: moveError } = await moveToDocuments({
      accountId,
      propertyId: entry.property.id,
      category,
      uploadedBy: session.user.id,
      sourceBucket: 'capture-attachments',
      sourcePath: entry.attachment_path,
      fileName,
    })

    if (moveError) {
      setProcessingId(null)
      setError(moveError.message ?? 'Could not move file to Documents')
      return
    }

    const { error: reconcileError } = await markReconciled(entry.id)
    setProcessingId(null)

    if (reconcileError) {
      setError(reconcileError.message)
      return
    }

    setEntries((prev) => prev.filter((e) => e.id !== entry.id))
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
    documentTypeOptions,
    categoryByEntry,
    setCategory,
    reconcile,
    viewAttachment,
  }
}
