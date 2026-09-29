import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AllocationStatus } from '../llcs/ownershipInterestsQueries'
import { interpretOwnershipError, listPropertyOwnershipInterests } from '../llcs/ownershipInterestsQueries'
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
  // 'saved_with_upload_errors' — the property/ownership are real and
  // committed (never rolled back or duplicated by a retry), but one or
  // more staged files did not finish uploading. The wizard stays open
  // and the draft is kept specifically so "Retry uploads" can call
  // save() again: the same idempotency key returns the same property
  // instantly (no re-creation) and only the still-failed files retry.
  kind: 'saved' | 'saved_with_upload_errors' | 'conflicting_retry' | 'error'
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
  // Package 1 completion — a real race the first fault-injection pass
  // surfaced: uploadStagedDocuments's own setStagedFiles calls (marking
  // each file 'uploading' then 'uploaded') queue re-renders of the
  // mirroring effect below; those can still be pending when save()'s own
  // clearPropertyCreationDraft/navigate runs after all uploads resolve,
  // so a stale queued write could silently resurrect the just-cleared
  // draft in sessionStorage. This ref, set the moment the draft is
  // cleared, makes the mirror a no-op from then on regardless of which
  // stale render it was scheduled from — the draft, once cleared or
  // cancelled, stays cleared.
  const draftClearedRef = useRef(false)

  // Mirrors every change into sessionStorage so a reload resumes into
  // this exact attempt (same idempotency key) instead of silently
  // starting a new one.
  useEffect(() => {
    if (draftClearedRef.current) return
    savePropertyCreationDraft(sessionStorage, {
      idempotencyKey: initialDraft.idempotencyKey,
      basics,
      ownershipEntries,
      allocationStatus,
      stagedFiles: stagedFiles.map(({ fileKey, name, size, linkedOwnerRowKeys }) => ({ fileKey, name, size, linkedOwnerRowKeys })),
    })
  }, [basics, ownershipEntries, allocationStatus, stagedFiles, initialDraft.idempotencyKey])

  const setBasicsField = (field: keyof typeof basics, value: string) => setBasics((prev) => ({ ...prev, [field]: value }))

  // Adds one blank row for the user to fill in — either by picking an
  // existing owner from the SearchableSelect, or via its own "+ Add
  // new" affordance (setOwnerRowMode below). Neither owner list nor
  // save logic ever assumes a row is complete just because it exists.
  const addOwnerRow = () => setOwnershipEntries((prev) => [...prev, { rowKey: crypto.randomUUID(), mode: 'existing', percentageText: '' }])

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

  // Removing a row also drops it from any staged file's own selection —
  // a file must never keep pointing at a rowKey that no longer exists.
  const removeOwnerRow = (index: number) => {
    setOwnershipEntries((prev) => {
      const removedKey = prev[index]?.rowKey
      if (removedKey) {
        setStagedFiles((files) => files.map((f) => ({ ...f, linkedOwnerRowKeys: f.linkedOwnerRowKeys.filter((k) => k !== removedKey) })))
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const addStagedFiles = (files: FileList | File[]) => {
    // Release-readiness corrections (defect #2, owner-approved
    // document-linking requirement) — property-only by default; nothing
    // links to every current owner just by being staged. The user opts
    // a file into specific owners explicitly, per file, on this step.
    const additions: StagedFile[] = Array.from(files).map((file) => ({
      fileKey: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      linkedOwnerRowKeys: [],
      file,
      uploadStatus: 'pending',
    }))
    setStagedFiles((prev) => [...prev, ...additions])
  }

  const removeStagedFile = (fileKey: string) => setStagedFiles((prev) => prev.filter((f) => f.fileKey !== fileKey))

  const reattachStagedFile = (fileKey: string, file: File) =>
    setStagedFiles((prev) => prev.map((f) => (f.fileKey === fileKey ? { ...f, file, uploadStatus: 'pending' } : f)))

  // Toggles a single (file, ownership-row) pairing — the only way a
  // file's owner links change. Never touches any other file's selection.
  const toggleStagedFileOwnerLink = (fileKey: string, rowKey: string) =>
    setStagedFiles((prev) =>
      prev.map((f) =>
        f.fileKey === fileKey
          ? { ...f, linkedOwnerRowKeys: f.linkedOwnerRowKeys.includes(rowKey) ? f.linkedOwnerRowKeys.filter((k) => k !== rowKey) : [...f.linkedOwnerRowKeys, rowKey] }
          : f,
      ),
    )

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
    draftClearedRef.current = true
    clearPropertyCreationDraft(sessionStorage)
  }

  // Uploads every staged file against an already-created property,
  // resuming correctly at whichever of the three boundaries (§6) a
  // prior attempt stopped at: Storage upload, documents row, owner
  // link. Each file's own state is independent — one file's failure
  // never blocks or duplicates another's.
  // Returns whether every staged file finished uploaded — save() uses
  // this (not the stagedFiles closure, which lags one render behind
  // React's async setState) to decide whether it's actually safe to
  // clear the draft and leave the wizard. A caller that ignored this and
  // navigated away on any per-file failure would strand that file with
  // no way back to it — the draft it needed to resume was already gone.
  //
  // Release-readiness corrections (owner-approved document-linking
  // requirement) — each file links only to the owners its own
  // linkedOwnerRowKeys names, resolved through rowKeyToLlcId (built by
  // save() from the property's real, committed ownership interests).
  // unresolvedRowKeys are rowKeys save() could not confidently resolve
  // (an inline-new-owner name collision) — a file selecting one of
  // those is held as an error rather than silently falling back to
  // "link to nothing" or "link to every owner."
  const uploadStagedDocuments = async (propertyId: string, rowKeyToLlcId: Map<string, string>, unresolvedRowKeys: Set<string>): Promise<boolean> => {
    let allSucceeded = true
    for (const staged of stagedFiles) {
      if (staged.uploadStatus === 'uploaded') continue
      if (!staged.file) {
        allSucceeded = false
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
          allSucceeded = false
          setStagedFiles((prev) => prev.map((f) => (f.fileKey === staged.fileKey ? { ...f, uploadStatus: 'error', uploadError: uploadError.message } : f)))
          continue
        }
        const { data: inserted, error: insertError } = await insertPropertyDocumentRow(accountId!, propertyId, storagePath, staged.file.size)
        if (insertError) {
          allSucceeded = false
          setStagedFiles((prev) => prev.map((f) => (f.fileKey === staged.fileKey ? { ...f, uploadStatus: 'error', uploadError: insertError.message } : f)))
          continue
        }
        documentId = inserted.id
      }

      const unresolvedSelected = staged.linkedOwnerRowKeys.filter((k) => unresolvedRowKeys.has(k))
      if (unresolvedSelected.length > 0) {
        allSucceeded = false
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.fileKey === staged.fileKey
              ? { ...f, uploadStatus: 'error', uploadError: 'Could not confirm which owner this links to — two new owners share the same name. Fix the ownership entries, then retry.' }
              : f,
          ),
        )
        continue
      }
      const ownerIds = staged.linkedOwnerRowKeys.map((k) => rowKeyToLlcId.get(k)).filter((id): id is string => !!id)

      let allLinksSucceeded = true
      for (const ownerId of ownerIds) {
        const { data: existingLink, error: linkLookupError } = await findDocumentOwnerLink(accountId!, documentId, ownerId)
        if (linkLookupError) {
          allLinksSucceeded = false
          continue
        }
        if (!existingLink) {
          const { error: linkError } = await linkPropertyDocumentToOwner(accountId!, documentId, ownerId)
          if (linkError) allLinksSucceeded = false
        }
      }
      if (!allLinksSucceeded) {
        allSucceeded = false
        setStagedFiles((prev) => prev.map((f) => (f.fileKey === staged.fileKey ? { ...f, uploadStatus: 'error', uploadError: 'The file uploaded but linking it to an owner failed — retry.' } : f)))
        continue
      }

      setStagedFiles((prev) => prev.map((f) => (f.fileKey === staged.fileKey ? { ...f, uploadStatus: 'uploaded' } : f)))
    }
    return allSucceeded
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

    let uploadsSucceeded = true
    if (stagedFiles.length > 0) {
      // Release-readiness corrections — a brand-new owner's id is minted
      // server-side inside createPropertyWithOwnership and isn't known
      // client-side until now, so each staged file's own explicit
      // per-owner selections (rowKey-keyed, from the Documents step)
      // must be resolved to real llc_ids from the property's own real,
      // server-confirmed ownership interests — the same rows
      // replace_property_ownership_interests just wrote inside the same
      // transaction as the property itself — never expanded to "every
      // current owner" as a fallback.
      const { data: ownershipInterests, error: ownershipLookupError } = await listPropertyOwnershipInterests(accountId, result.propertyId)
      if (ownershipLookupError) {
        setSaving(false)
        setError('Property saved, but could not confirm its owners to link documents to. Retry from this screen.')
        return { kind: 'saved_with_upload_errors', propertyId: result.propertyId }
      }
      const interests = ownershipInterests ?? []
      const rowKeyToLlcId = new Map<string, string>()
      const unresolvedRowKeys = new Set<string>()
      // An 'existing' row already names its real id directly — no lookup
      // needed, and no ambiguity possible.
      const claimedByExisting = new Set<string>()
      for (const row of ownershipEntries) {
        if (row.mode === 'existing' && row.ownerId) {
          rowKeyToLlcId.set(row.rowKey, row.ownerId)
          claimedByExisting.add(row.ownerId)
        }
      }
      // A 'new' row has no id until the server mints one; correlate by
      // the exact name submitted, among interests not already claimed by
      // an existing row's own id. Two new rows sharing the identical
      // trimmed name are genuinely ambiguous — resolving one of them by
      // process of elimination would be a guess dressed up as a match,
      // so every row sharing a colliding name is left unresolved, not
      // just the second one in submission order.
      const newRows = ownershipEntries.filter((row) => row.mode === 'new')
      const nameCounts = new Map<string, number>()
      for (const row of newRows) {
        const name = (row.newOwnerName ?? '').trim()
        if (name) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
      }
      const availableForNewRows = interests.filter((i) => !claimedByExisting.has(i.llc_id))
      for (const row of newRows) {
        const name = (row.newOwnerName ?? '').trim()
        if (!name || (nameCounts.get(name) ?? 0) > 1) {
          unresolvedRowKeys.add(row.rowKey)
          continue
        }
        const matchIndex = availableForNewRows.findIndex((i) => i.owner_name.trim() === name)
        if (matchIndex === -1) {
          unresolvedRowKeys.add(row.rowKey)
          continue
        }
        rowKeyToLlcId.set(row.rowKey, availableForNewRows[matchIndex].llc_id)
        availableForNewRows.splice(matchIndex, 1)
      }
      uploadsSucceeded = await uploadStagedDocuments(result.propertyId, rowKeyToLlcId, unresolvedRowKeys)
    }

    setSaving(false)

    if (!uploadsSucceeded) {
      // The property is real and won't be duplicated by a retry (same
      // idempotency key, same payload — createPropertyWithOwnership's
      // own fast path returns this exact id again). Deliberately do NOT
      // clear the draft or navigate: doing so here would strand the
      // failed file with no way back to it, since the draft is what
      // "Retry uploads" and a reload's re-attach prompt both depend on.
      setError('One or more documents did not finish uploading. Retry from this screen before leaving.')
      return { kind: 'saved_with_upload_errors', propertyId: result.propertyId }
    }

    draftClearedRef.current = true
    clearPropertyCreationDraft(sessionStorage)
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
    toggleStagedFileOwnerLink,
    goNext,
    goBack,
    goToStep,
    cancel,
    save,
  }
}
