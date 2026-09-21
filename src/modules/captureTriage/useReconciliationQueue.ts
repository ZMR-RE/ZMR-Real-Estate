import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { usePickListOptions } from '../../shared/pickLists/usePickListOptions'
import { listProperties } from '../properties/propertiesQueries'
import { useVendors } from '../vendors/useVendors'
import { moveToDocuments, type DocumentCategory } from '../documents/documentsQueries'
import { isCaptureEntryComplete } from '../capture/captureCalculations'
import { saveCaptureEntryDetails, type SaveCaptureEntryDetailsInput } from '../capture/captureActions'
import {
  deleteCaptureAttachment,
  getAttachmentSignedUrl,
  markReconciled,
  setManuallyCompleted,
  voidCaptureEntry,
  type CaptureEntry,
} from '../capture/captureQueries'
import { listUnreconciled, type QueueEntry } from './reconciliationQueries'

export function useReconciliationQueue() {
  const { session, accountId } = useAuth()
  const documentTypeOptions = usePickListOptions('document_type')
  const { vendorOptions, addVendor } = useVendors(accountId)
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [categoryByEntry, setCategoryByEntry] = useState<Record<string, DocumentCategory | ''>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: propertyLabel(p) })))
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

  // Moves every staged attachment into its permanent Documents path and
  // records each in the documents table (roadmap 2.6), then marks the
  // capture_log entry reconciled — in that order, so an entry never gets
  // marked reconciled with an attachment still stuck in staging. A
  // category is only required when there's actually something to move
  // (roadmap 1.7 made attachments optional, so a mileage or notes-only
  // entry can have zero). Roadmap 1.11 — blocked entirely while the
  // entry still Needs details, unless manually_completed overrides it
  // (isCaptureEntryComplete already accounts for that).
  const reconcile = async (entry: QueueEntry) => {
    if (!isCaptureEntryComplete(entry)) {
      setError('This entry still needs details before it can be reconciled.')
      return
    }

    const category = categoryByEntry[entry.id]
    if (entry.attachments.length > 0 && !category) {
      setError('Choose a document category before reconciling.')
      return
    }
    if (!accountId || !session) return

    setProcessingId(entry.id)

    for (const attachment of entry.attachments) {
      const fileName = attachment.storage_path.split('/').pop() ?? attachment.storage_path
      const { error: moveError } = await moveToDocuments({
        accountId,
        propertyId: entry.property.id,
        category: category as DocumentCategory,
        uploadedBy: session.user.id,
        sourceBucket: 'capture-attachments',
        sourcePath: attachment.storage_path,
        fileName,
      })

      if (moveError) {
        setProcessingId(null)
        setError(moveError.message ?? 'Could not move file to Documents')
        return
      }

      // The file no longer lives at this capture-attachments path — it's
      // in Documents now — so the capture_attachments row pointing at it
      // has to go too, or "Recently logged" would offer a broken "View"
      // link for this now-reconciled entry.
      const { error: deleteAttachmentError } = await deleteCaptureAttachment(attachment.id)
      if (deleteAttachmentError) {
        setProcessingId(null)
        setError(deleteAttachmentError.message)
        return
      }
    }

    const { error: reconcileError } = await markReconciled(entry.id)
    setProcessingId(null)

    if (reconcileError) {
      setError(reconcileError.message)
      return
    }

    setEntries((prev) => prev.filter((e) => e.id !== entry.id))
  }

  const startEditing = (id: string) => {
    setDetailsError(null)
    setEditingId(id)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setDetailsError(null)
  }

  const saveDetails = async (entry: CaptureEntry, input: SaveCaptureEntryDetailsInput) => {
    if (!accountId) return
    setProcessingId(entry.id)
    const { error: saveError } = await saveCaptureEntryDetails(accountId, entry, input)
    setProcessingId(null)

    if (saveError) {
      setDetailsError(saveError)
      return
    }
    setDetailsError(null)
    setEditingId(null)
    await refresh()
  }

  const toggleManuallyCompleted = async (entry: CaptureEntry) => {
    setProcessingId(entry.id)
    const { error: updateError } = await setManuallyCompleted(entry.id, !entry.manually_completed)
    setProcessingId(null)

    if (updateError) {
      setError(updateError.message)
      return
    }
    await refresh()
  }

  const voidEntry = async (id: string) => {
    setProcessingId(id)
    const { error: voidError } = await voidCaptureEntry(id)
    setProcessingId(null)

    if (voidError) {
      setError(voidError.message)
      return
    }
    setEntries((prev) => prev.filter((e) => e.id !== id))
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
    vendorOptions,
    onCreateVendor: addVendor,
    categoryByEntry,
    setCategory,
    reconcile,
    editingId,
    startEditing,
    cancelEditing,
    detailsError,
    saveDetails,
    toggleManuallyCompleted,
    voidEntry,
    viewAttachment,
  }
}
