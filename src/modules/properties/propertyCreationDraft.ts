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
}

export interface OwnershipDraftEntry {
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
    return parsed as PropertyCreationDraft
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

export function createEmptyDraft(idempotencyKey: string): PropertyCreationDraft {
  return {
    idempotencyKey,
    basics: { address: '', city: '', state: '', zip: '', status: 'active' },
    ownershipEntries: [],
    allocationStatus: 'incomplete',
    stagedFiles: [],
  }
}
