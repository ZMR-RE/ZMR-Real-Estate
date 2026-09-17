import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { isCaptureEntryComplete } from './captureCalculations'
import { saveCaptureEntryDetails, type SaveCaptureEntryDetailsInput } from './captureActions'
import {
  getAttachmentSignedUrl,
  listCaptureEntries,
  setManuallyCompleted,
  voidCaptureEntry,
  type CaptureEntry,
  type EntryType,
} from './captureQueries'

export type CompleteFilter = 'all' | 'complete' | 'needs_details'
export type TypeFilter = EntryType | 'all'

const RECENT_LIMIT = 25

// Roadmap 1.10/1.15 — Quick Capture's "History" tab (formerly "Recently
// logged"). Reads the same listCaptureEntries() the Reconciliation Queue
// reads (captureQueries.ts), just with no reconciled filter (shows
// both), so there's one underlying data source behind both screens
// rather than two.
export function useCaptureHistory() {
  const { accountId } = useAuth()
  const [entries, setEntries] = useState<CaptureEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completeFilter, setCompleteFilter] = useState<CompleteFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listCaptureEntries(accountId, { limit: RECENT_LIMIT })
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setEntries(data ?? [])
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filteredEntries = entries
    .filter((entry) => {
      if (completeFilter === 'all') return true
      const complete = isCaptureEntryComplete(entry)
      return completeFilter === 'complete' ? complete : !complete
    })
    .filter((entry) => typeFilter === 'all' || entry.entry_type === typeFilter)

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
    await refresh()
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
    entries: filteredEntries,
    loading,
    error,
    completeFilter,
    setCompleteFilter,
    typeFilter,
    setTypeFilter,
    editingId,
    startEditing,
    cancelEditing,
    processingId,
    detailsError,
    saveDetails,
    toggleManuallyCompleted,
    voidEntry,
    viewAttachment,
    refresh,
  }
}
