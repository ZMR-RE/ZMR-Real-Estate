import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { usePickListOptions } from '../../shared/pickLists/usePickListOptions'
import { listProperties } from '../properties/propertiesQueries'
import { useVendors } from '../vendors/useVendors'
import { moveToDocuments, type DocumentCategory } from '../documents/documentsQueries'
import { createTransactionFromCapture, type Category, type RepairOrImprovement } from '../financials/financialsQueries'
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
  const { vendorOptions, addVendor, refreshVendorOptions } = useVendors(accountId)
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

  // For a Receipt (roadmap 9.9, Receipt-only per confirmed scope), creates
  // the real financial_transactions row this entry's fields describe
  // FIRST, then moves every staged attachment into its permanent Documents
  // path (roadmap 2.6), passing that transaction's id through so the moved
  // document is actually linked to it — the Documents panel (9.6) reads
  // documents by transaction_id, so moving attachments before the
  // transaction existed (the original order here) left every reconciled
  // Receipt's attachment unlinked (found by T5). Finally marks the
  // capture_log entry reconciled and links it to that transaction. A
  // document category is only required when there's actually something to
  // move (roadmap 1.7 made attachments optional, so a mileage or
  // notes-only entry can have zero). Roadmap 1.11 — blocked entirely while
  // the entry still Needs details, unless manually_completed overrides it
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

    // Roadmap 9.9 — a Receipt can be "Complete" (has an attachment) and
    // still be missing what's actually required to create a real
    // transaction, since none of these three were ever required to
    // reconcile before this bridge existed. Checked up front, before
    // moving any attachments, so a failed check never leaves the entry
    // half-processed.
    if (entry.entry_type === 'receipt') {
      if (entry.amount === null) {
        setError('Amount is required before this receipt can be reconciled.')
        return
      }
      if (!entry.transaction_category) {
        setError('Category is required before this receipt can be reconciled.')
        return
      }
      if (!entry.payment_method) {
        setError('Payment method is required before this receipt can be reconciled.')
        return
      }
    }

    if (!accountId || !session) return

    setProcessingId(entry.id)

    let financialTransactionId: string | null = null

    if (entry.entry_type === 'receipt') {
      // receipt_type defaults to 'expense' in the capture form itself;
      // null here only for pre-1.31 rows that predate the field.
      const receiptType = entry.receipt_type ?? 'expense'
      const isRefundReturn = receiptType === 'refund_return'
      const magnitude = Number(entry.amount)

      const { data: transaction, error: transactionError } = await createTransactionFromCapture(
        accountId,
        session.user.id,
        {
          propertyId: entry.property.id,
          // Refund-Return reduces the original expense category's total
          // rather than adding to Income — implemented as a negative
          // amount on an 'expense' row in that same category, so it nets
          // out naturally wherever P&L already sums by category (see
          // 20260922030000's amount<>0 constraint).
          entryType: isRefundReturn ? 'expense' : (receiptType as 'expense' | 'income'),
          category: entry.transaction_category as Category,
          subcategory: entry.category,
          vendorId: entry.paid_to_vendor_id,
          tenantId: entry.paid_to_tenant_id,
          prospectiveTenantId: entry.paid_to_prospective_tenant_id,
          unit: entry.unit?.unit_label ?? null,
          paymentMethod: entry.payment_method as string,
          repairOrImprovement: entry.repair_or_improvement as RepairOrImprovement | null,
          amount: isRefundReturn ? -magnitude : magnitude,
          transactionDate: entry.entry_date,
          description: entry.notes?.trim() || null,
        },
      )

      if (transactionError || !transaction) {
        setProcessingId(null)
        setError(transactionError?.message ?? 'Could not create the transaction for this receipt.')
        return
      }

      financialTransactionId = transaction.id
    }

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
        transactionId: financialTransactionId,
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

    const { error: reconcileError } = await markReconciled(
      entry.id,
      entry.entry_type === 'receipt' ? financialTransactionId : undefined,
    )
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
    accountId,
    propertyOptions,
    propertyFilter,
    setPropertyFilter,
    loading,
    error,
    processingId,
    documentTypeOptions,
    vendorOptions,
    onCreateVendor: addVendor,
    refreshVendorOptions,
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
