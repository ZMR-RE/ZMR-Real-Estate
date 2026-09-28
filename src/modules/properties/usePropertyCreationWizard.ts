import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AllocationStatus } from '../llcs/ownershipInterestsQueries'
import { interpretOwnershipError } from '../llcs/ownershipInterestsQueries'
import {
  createPropertyWithOwnership,
  findPropertyDocumentByPath,
  findDocumentOwnerLink,
  insertPropertyDocumentRow,
  linkPropertyDocumentToOwner,
  uploadPropertyDocumentFile,
  buildPropertyDocumentStoragePath,
  type WizardOwnershipEntry,
} from './propertyCreationQueries'
import { validateWizardOwnershipEntries } from './propertyCreationValidation'
import {
  clearPropertyCreationDraft,
  createEmptyDraft,
  loadPropertyCreationDraft,
  savePropertyCreationDraft,
  type OwnershipDraftEntry,
  type StagedFileMeta,
} from './propertyCreationDraft'

export type WizardStep = 1 | 2 | 3 | 4

// A staged file combines what survives a reload (StagedFileMeta) with
// the actual File object, which does not — `file` is null for a row
// that was resumed from a reload but not yet re-attached; the Documents
// step must prompt for re-selection in that state, never silently skip
// or silently drop it.
export interface StagedFile extends StagedFileMeta {
  file: File | null
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error'
  uploadError?: string
}

export interface PropertyCreationSaveResult {
  kind: 'saved' | 'conflicting_retry' | 'error'
  propertyId?: string
  message?: string
}

// Package 1 — business logic for the four-step creation wizard: state,
// navigation, resumability, and the save orchestration (atomic
// property+ownership RPC, then per-file document recovery). Calls
// propertyCreationQueries.ts, never Supabase directly (CLAUDE.md's
// module-shape rule).
export function usePropertyCreationWizard(accountId: string | null) {
  const navigate = useNavigate()
  // Computed lazily, exactly once, on mount — this is the one legitimate
  // read of sessionStorage for this wizard instance; every field below
  // seeds its own state from this same snapshot rather than reading it
  // again later, so a change to sessionStorage elsewhere never reaches
  // back in and rewrites an already-mounted wizard's state.
  const [initialDraft] = useState(() => loadPropertyCreationDraft(sessionStorage) ?? createEmptyDraft(crypto.randomUUID()))
  const [step, setStep] = useState<WizardStep>(1)
  const [basics, setBasics] = useState(initialDraft.basics)
  const [addressTouched, setAddressTouched] = useState(false)
  const [ownershipEntries, setOwnershipEntries] = useState<OwnershipDraftEntry[]>(initialDraft.ownershipEntries)
  const [allocationStatus, setAllocationStatus] = useState<AllocationStatus>(initialDraft.allocationStatus)
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>(
    initialDraft.stagedFiles.map((f) => ({ ...f, file: null, uploadStatus: 'pending' as const })),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mirrors every change into sessionStorage so a reload resumes into
  // this exact attempt (same idempotency key) instead of silently
  // starting a new one.
  useEffect(() => {
    savePropertyCreationDraft(sessionStorage, {
      idempotencyKey: initialDraft.idempotencyKey,
      basics,
      ownershipEntries,
      allocationStatus,
      stagedFiles: stagedFiles.map(({ fileKey, name, size }) => ({ fileKey, name, size })),
    })
  }, [basics, ownershipEntries, allocationStatus, stagedFiles, initialDraft.idempotencyKey])

  const setBasicsField = (field: keyof typeof basics, value: string) => setBasics((prev) => ({ ...prev, [field]: value }))

  // Adds one blank row for the user to fill in — either by picking an
  // existing owner from the SearchableSelect, or via its own "+ Add
  // new" affordance (setOwnerRowMode below). Neither owner list nor
  // save logic ever assumes a row is complete just because it exists.
  const addOwnerRow = () => setOwnershipEntries((prev) => [...prev, { mode: 'existing', percentageText: '' }])

  const updateOwnerRow = (index: number, patch: Partial<OwnershipDraftEntry>) =>
    setOwnershipEntries((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  // Switches an existing row between picking a real owner and naming a
  // new one, in place — used by SearchableSelect's own onAddNew
  // affordance, so "+ Add new" behaves the same way here as everywhere
  // else it appears in the app.
  const setOwnerRowMode = (index: number, mode: 'existing' | 'new') =>
    setOwnershipEntries((prev) =>
      prev.map((row, i) => (i === index ? { ...row, mode, ownerId: mode === 'existing' ? row.ownerId : undefined, newOwnerName: mode === 'new' ? (row.newOwnerName ?? '') : undefined } : row)),
    )

  const removeOwnerRow = (index: number) => setOwnershipEntries((prev) => prev.filter((_, i) => i !== index))

  const addStagedFiles = (files: FileList | File[]) => {
    const additions: StagedFile[] = Array.from(files).map((file) => ({
      fileKey: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      file,
      uploadStatus: 'pending',
    }))
    setStagedFiles((prev) => [...prev, ...additions])
  }

  const removeStagedFile = (fileKey: string) => setStagedFiles((prev) => prev.filter((f) => f.fileKey !== fileKey))

  const reattachStagedFile = (fileKey: string, file: File) =>
    setStagedFiles((prev) => prev.map((f) => (f.fileKey === fileKey ? { ...f, file, uploadStatus: 'pending' } : f)))

  // Rows the user added but never finished (an "existing" row with no
  // owner picked yet) are dropped here rather than sent to the server —
  // they carry no data to save, and a bare unfilled row disappearing on
  // Save (rather than raising a confusing error) matches how the rest
  // of the wizard treats an untouched optional field.
  const entriesToWizardOwnership = (): WizardOwnershipEntry[] =>
    ownershipEntries
      .filter((row) => (row.mode === 'existing' ? !!row.ownerId : (row.newOwnerName ?? '').trim() !== ''))
      .map((row) => {
        const percentage = row.percentageText.trim() === '' ? null : Number(row.percentageText)
        if (row.mode === 'existing') return { ownerId: row.ownerId!, percentage }
        return { newOwnerName: (row.newOwnerName ?? '').trim(), ownerKind: row.ownerKind ?? null, percentage }
      })

  const addressValid = basics.address.trim().length > 0

  const goNext = () => {
    if (step === 2 && !addressValid) {
      setAddressTouched(true)
      return
    }
    setStep((s) => (Math.min(4, s + 1) as WizardStep))
  }
  const goBack = () => setStep((s) => (Math.max(1, s - 1) as WizardStep))
  const goToStep = (n: WizardStep) => setStep(n)

  const cancel = () => {
    clearPropertyCreationDraft(sessionStorage)
  }

  // Uploads every staged file against an already-created property,
  // resuming correctly at whichever of the three boundaries (§6) a
  // prior attempt stopped at: Storage upload, documents row, owner
  // link. Each file's own state is independent — one file's failure
  // never blocks or duplicates another's.
  const uploadStagedDocuments = async (propertyId: string, ownerIds: string[]) => {
    for (const staged of stagedFiles) {
      if (staged.uploadStatus === 'uploaded') continue
      if (!staged.file) {
        setStagedFiles((prev) =>
          prev.map((f) => (f.fileKey === staged.fileKey ? { ...f, uploadStatus: 'error', uploadError: 'Re-attach this file to finish uploading it.' } : f)),
        )
        continue
      }
      setStagedFiles((prev) => prev.map((f) => (f.fileKey === staged.fileKey ? { ...f, uploadStatus: 'uploading' } : f)))

      const storagePath = buildPropertyDocumentStoragePath(accountId!, initialDraft.idempotencyKey, staged.fileKey, staged.name)
      const { data: existingDoc } = await findPropertyDocumentByPath(accountId!, storagePath)
      let documentId = existingDoc?.id ?? null

      if (!documentId) {
        const { error: uploadError } = await uploadPropertyDocumentFile(storagePath, staged.file)
        if (uploadError) {
          setStagedFiles((prev) => prev.map((f) => (f.fileKey === staged.fileKey ? { ...f, uploadStatus: 'error', uploadError: uploadError.message } : f)))
          continue
        }
        const { data: inserted, error: insertError } = await insertPropertyDocumentRow(accountId!, propertyId, storagePath, staged.file.size)
        if (insertError) {
          setStagedFiles((prev) => prev.map((f) => (f.fileKey === staged.fileKey ? { ...f, uploadStatus: 'error', uploadError: insertError.message } : f)))
          continue
        }
        documentId = inserted.id
      }

      for (const ownerId of ownerIds) {
        const { data: existingLink } = await findDocumentOwnerLink(accountId!, documentId, ownerId)
        if (!existingLink) {
          await linkPropertyDocumentToOwner(accountId!, documentId, ownerId)
        }
      }

      setStagedFiles((prev) => prev.map((f) => (f.fileKey === staged.fileKey ? { ...f, uploadStatus: 'uploaded' } : f)))
    }
  }

  const save = async (): Promise<PropertyCreationSaveResult> => {
    if (!accountId) return { kind: 'error', message: 'No account.' }
    const wizardEntries = entriesToWizardOwnership()
    const check = validateWizardOwnershipEntries(wizardEntries, allocationStatus)
    if (!check.valid) {
      setError(check.error ?? 'Invalid ownership entry.')
      return { kind: 'error', message: check.error }
    }
    setSaving(true)
    setError(null)

    const result = await createPropertyWithOwnership(
      accountId,
      initialDraft.idempotencyKey,
      { name: null, address: basics.address, city: basics.city, state: basics.state, zip: basics.zip, status: basics.status },
      wizardEntries,
      allocationStatus,
    )

    if (result.kind === 'error') {
      const interpreted = interpretOwnershipError({ code: undefined, message: result.message })
      setError(interpreted.message)
      setSaving(false)
      return { kind: 'error', message: result.message }
    }
    if (result.kind === 'conflicting_retry') {
      setError(result.message)
      setSaving(false)
      return { kind: 'conflicting_retry', message: result.message }
    }

    // Only owners the client already had a real id for — a brand-new
    // owner's id is minted server-side inside the same call and isn't
    // known here, so its document link is completed by the property's
    // own Documents tab afterward, not blocked on here.
    const ownerIds = wizardEntries.filter((e): e is Extract<WizardOwnershipEntry, { ownerId: string }> => 'ownerId' in e && !!e.ownerId).map((e) => e.ownerId)
    if (stagedFiles.length > 0) {
      // A brand-new owner's id isn't known client-side (the server
      // mints it) — document links for that case are completed by the
      // Property Documents tab's own "Review saved contact details" /
      // ownership-linking pass after creation, not blocked here.
      await uploadStagedDocuments(result.propertyId, ownerIds)
    }

    clearPropertyCreationDraft(sessionStorage)
    setSaving(false)
    // Batch S1's own rule, unchanged: a brand-new property has no KPI
    // data yet, so it lands on Overview instead of usePropertyProfile's
    // existing-property default (KPI). Same router-state mechanism
    // usePropertyRegistry's own create path already uses.
    navigate(`/properties/${result.propertyId}`, { state: { initialTab: 'overview' } })
    return { kind: 'saved', propertyId: result.propertyId }
  }

  return {
    step,
    basics,
    addressTouched,
    addressValid,
    ownershipEntries,
    allocationStatus,
    stagedFiles,
    saving,
    error,
    setBasicsField,
    setAddressTouched,
    addOwnerRow,
    setOwnerRowMode,
    updateOwnerRow,
    removeOwnerRow,
    setAllocationStatus,
    addStagedFiles,
    removeStagedFile,
    reattachStagedFile,
    goNext,
    goBack,
    goToStep,
    cancel,
    save,
  }
}
