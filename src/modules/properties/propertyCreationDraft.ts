import type { SearchableSelectOption } from '../../shared/SearchableSelect'

// Package 1 §6 — pure, no-I/O persistence shape for the creation
// wizard's resumability. Kept free of any Supabase/DOM-storage-specific
// code beyond sessionStorage itself so the shape and its load/save/clear
// logic are unit-testable without mocking the network.
//
// Deliberately excludes the actual `File` objects (they cannot survive a
// reload) — only their {fileKey, name, size} survive, so a resumed
// wizard can show "you had selected: invoice.pdf (142 KB) — please
// re-attach it" and reuse the same fileKey/storage path once the user
// re-selects the real bytes, rather than treating the reselection as a
// new, sixth file.

export interface StagedFileMeta {
  fileKey: string
  name: string
  size: number
  // Release-readiness corrections — which ownership rows (by their own
  // rowKey, never by array index, which shifts as rows are added/
  // removed/reordered) this specific file should be linked to once the
  // property is saved. Empty means property-only, the default for a
  // newly-staged file — nothing links to every current owner by
  // implication anymore.
  linkedOwnerRowKeys: string[]
}

export interface OwnershipDraftEntry {
  // Stable per-row identity, generated once when the row is added and
  // carried through reload — a staged file's linkedOwnerRowKeys
  // references this, never the row's position in the array (which
  // shifts when rows are added, removed, or reordered).
  rowKey: string
  mode: 'existing' | 'new'
  ownerId?: string
  newOwnerName?: string
  ownerKind?: 'individual' | 'entity' | null
  percentageText: string
}

export interface PropertyCreationDraft {
  idempotencyKey: string
  basics: {
    address: string
    city: string
    state: string
    zip: string
    status: 'active' | 'inactive' | 'sold'
  }
  ownershipEntries: OwnershipDraftEntry[]
  allocationStatus: 'incomplete' | 'complete'
  stagedFiles: StagedFileMeta[]
}

const STORAGE_KEY = 'zmr:property-creation-draft'

export function loadPropertyCreationDraft(storage: Pick<Storage, 'getItem'>): PropertyCreationDraft | null {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.idempotencyKey !== 'string') return null
    // A draft written before rowKey/linkedOwnerRowKeys existed (this is
    // sessionStorage, ephemeral per tab, never a migrated shape) is
    // backfilled rather than discarded — a stale draft mid-session
    // should resume, not silently lose the user's in-progress entries.
    const draft = parsed as PropertyCreationDraft
    draft.ownershipEntries = (draft.ownershipEntries ?? []).map((e) => ({ ...e, rowKey: e.rowKey ?? crypto.randomUUID() }))
    draft.stagedFiles = (draft.stagedFiles ?? []).map((f) => ({ ...f, linkedOwnerRowKeys: f.linkedOwnerRowKeys ?? [] }))
    return draft
  } catch {
    return null
  }
}

export function savePropertyCreationDraft(storage: Pick<Storage, 'setItem'>, draft: PropertyCreationDraft): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

export function clearPropertyCreationDraft(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(STORAGE_KEY)
}

// Shared by the Documents step (owner checkboxes) and the Review step
// (per-file link summary) — one row's display label, whether it names a
// real existing owner or an inline-new one not yet saved.
export function ownerRowDisplayName(row: OwnershipDraftEntry, llcOptions: SearchableSelectOption[]): string {
  if (row.mode === 'new') return row.newOwnerName || '(new owner not yet named)'
  return llcOptions.find((o) => o.id === row.ownerId)?.label ?? '(no owner selected)'
}

export function createEmptyDraft(idempotencyKey: string): PropertyCreationDraft {
  return {
    idempotencyKey,
    basics: { address: '', city: '', state: '', zip: '', status: 'active' },
    ownershipEntries: [],
    allocationStatus: 'incomplete',
    stagedFiles: [],
  }
}
