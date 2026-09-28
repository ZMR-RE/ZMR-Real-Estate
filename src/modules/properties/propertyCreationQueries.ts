import { supabase } from '../../shared/supabaseClient'
import type { PropertyInput } from './propertiesQueries'
import type { AllocationStatus } from '../llcs/ownershipInterestsQueries'

// Package 1 §5 — every Supabase call for the four-step creation wizard,
// nothing else (CLAUDE.md's module-shape rule). The atomic write path is
// create_property_with_ownership (20260928020000_create_property_with_ownership.sql):
// one RPC call reserves the idempotency key, creates any inline new
// owners, inserts the property, and calls the existing
// replace_property_ownership_interests — all inside one Postgres
// transaction. There is no separate createProperty + separate ownership
// call for the wizard's own Save step; propertiesQueries.createProperty
// remains what it always was, unrelated to this flow.

// An ownership entry the wizard can submit is EITHER a reference to an
// existing owner, or a request to create one inline — never both, and
// the two are mutually exclusive by shape so a caller can't send an
// ambiguous entry.
export type WizardOwnershipEntry =
  | { ownerId: string; newOwnerName?: undefined; ownerKind?: undefined; percentage: number | null; effectiveDate?: string | null }
  | { ownerId?: undefined; newOwnerName: string; ownerKind: 'individual' | 'entity' | null; percentage: number | null; effectiveDate?: string | null }

export type CreatePropertyResult =
  | { kind: 'created'; propertyId: string }
  // Same idempotency key, different payload — the request must not be
  // silently resubmitted; the caller needs a new key (a genuinely new
  // creation attempt), not a retry.
  | { kind: 'conflicting_retry'; message: string }
  | { kind: 'error'; message: string }

export async function createPropertyWithOwnership(
  accountId: string,
  idempotencyKey: string,
  property: Partial<PropertyInput>,
  ownershipEntries: WizardOwnershipEntry[],
  allocationStatus: AllocationStatus,
): Promise<CreatePropertyResult> {
  const { data, error } = await supabase.rpc('create_property_with_ownership', {
    p_account_id: accountId,
    p_idempotency_key: idempotencyKey,
    p_property: property,
    p_ownership_entries: ownershipEntries.map((e) =>
      'newOwnerName' in e && e.newOwnerName !== undefined
        ? { new_owner_name: e.newOwnerName, owner_kind: e.ownerKind, percentage: e.percentage, effective_date: e.effectiveDate ?? null }
        : { owner_id: e.ownerId, percentage: e.percentage, effective_date: e.effectiveDate ?? null },
    ),
    p_allocation_status: allocationStatus,
  })

  if (error) {
    if (error.code === 'ZM005') return { kind: 'conflicting_retry', message: error.message }
    return { kind: 'error', message: error.message }
  }
  return { kind: 'created', propertyId: data as string }
}

// --- Document recovery (§6) ---
//
// Storage path is a deterministic function of (idempotency key, file
// key): ${accountId}/properties/${idempotencyKey}/${fileKey}-${name}.
// Re-running the exact same upload after a retry targets the exact same
// object, never a new one — this is what makes each of the three
// boundaries below independently resumable instead of needing its own
// bespoke recovery.
export function buildPropertyDocumentStoragePath(accountId: string, idempotencyKey: string, fileKey: string, fileName: string) {
  return `${accountId}/properties/${idempotencyKey}/${fileKey}-${fileName}`
}

// Boundary check used before every (re)upload attempt: if a documents
// row already exists for this exact path, a prior attempt already
// finished this file completely (upload + row) — skip straight to the
// owner-link check instead of re-uploading. Scoped by account_id, same
// as every other query in this module, never a bare storage_path match.
export async function findPropertyDocumentByPath(accountId: string, storagePath: string) {
  return supabase.from('documents').select('id, storage_path').eq('account_id', accountId).eq('storage_path', storagePath).maybeSingle()
}

export async function uploadPropertyDocumentFile(storagePath: string, file: File) {
  return supabase.storage.from('documents').upload(storagePath, file, { upsert: true })
}

export async function insertPropertyDocumentRow(accountId: string, propertyId: string, storagePath: string, fileSize: number) {
  return supabase
    .from('documents')
    .insert({ account_id: accountId, property_id: propertyId, category: 'Deed / acquisition', storage_path: storagePath, file_size: fileSize })
    .select('id')
    .single()
}

export async function findDocumentOwnerLink(accountId: string, documentId: string, llcId: string) {
  return supabase
    .from('document_owner_links')
    .select('id')
    .eq('account_id', accountId)
    .eq('document_id', documentId)
    .eq('llc_id', llcId)
    .maybeSingle()
}

export async function linkPropertyDocumentToOwner(accountId: string, documentId: string, llcId: string) {
  return supabase.from('document_owner_links').insert({ account_id: accountId, document_id: documentId, llc_id: llcId })
}

// Verified-safe cleanup only (§6): lists objects under the account's own
// prefix so a caller can cross-check against `documents.storage_path`
// and an age gate before ever deleting anything — this module exposes
// the list, never a delete-by-pattern helper, so an orphan sweep can't
// become a blind delete by construction.
export async function listPropertyCreationStorageObjects(accountId: string, idempotencyKey: string) {
  return supabase.storage.from('documents').list(`${accountId}/properties/${idempotencyKey}`)
}
