import { supabase } from '../../shared/supabaseClient'

// Document type (roadmap 8.1) — an account-scoped pick list
// (list_name 'document_type') rather than a fixed set. See
// shared/pickLists for the add/archive UI.
export type DocumentCategory = string

export interface DocumentRecord {
  id: string
  property_id: string | null
  transaction_id: string | null
  category: DocumentCategory
  label: string | null
  link_url: string | null
  link_type: 'drive_folder' | null
  storage_path: string | null
  file_size: number | null
  uploaded_at: string
}

const DOCUMENT_COLUMNS = 'id, property_id, transaction_id, category, label, link_url, link_type, storage_path, file_size, uploaded_at'

export async function listDocuments(accountId: string, propertyId: string) {
  return supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('uploaded_at', { ascending: false })
    .returns<DocumentRecord[]>()
}

// Roadmap 9.6 — documents attached directly to a financial transaction
// (e.g. a receipt), distinct from the 2.6 reconcile-to-Documents flow.
export async function listDocumentsForTransaction(accountId: string, transactionId: string) {
  return supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('account_id', accountId)
    .eq('transaction_id', transactionId)
    .order('uploaded_at', { ascending: false })
    .returns<DocumentRecord[]>()
}

// Roadmap 10.5 — links + file attachments on an action item's detail
// view, same table/pattern as listDocumentsForTransaction.
export async function listDocumentsForActionItem(accountId: string, actionItemId: string) {
  return supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('account_id', accountId)
    .eq('action_item_id', actionItemId)
    .order('uploaded_at', { ascending: false })
    .returns<DocumentRecord[]>()
}

// Default 60s suits the existing "click to view, opens immediately"
// callers. Roadmap 7.32's property photo renders as a persistent <img>
// while the page stays open, so it passes a longer expiry explicitly
// rather than needing a second function.
export async function getDocumentSignedUrl(path: string, expiresIn = 60) {
  return supabase.storage.from('documents').createSignedUrl(path, expiresIn)
}

// Roadmap 7.32 (6) — property photo, reusing the existing documents
// architecture instead of a new storage system: "the property photo" is
// simply the most recent 'Photos'-category document that's an actual
// file (not a reference link — documents_file_or_link_check allows
// a category row with only a link_url, e.g. via the Activity &
// Documents tab's freeform link entry, 7.17). Fetches a few and picks
// the first real file client-side rather than relying on a `.not(...
// is null)` filter, since this is the only place in the app that needs
// one.
//
// Roadmap 7.39 (3) — generalized from "getLatestPropertyPhoto" (still
// exported below, now just a thin category='Photos' wrapper so nothing
// else has to change) so the Deed document field can fetch the latest
// 'Deed'-category document the exact same way, without a second near-
// identical query.
export async function getLatestPropertyDocumentByCategory(accountId: string, propertyId: string, category: DocumentCategory) {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .eq('category', category)
    .order('uploaded_at', { ascending: false })
    .limit(5)
    .returns<DocumentRecord[]>()

  if (error) return { data: null, error }
  return { data: data?.find((doc) => doc.storage_path !== null) ?? null, error: null }
}

export async function getLatestPropertyPhoto(accountId: string, propertyId: string) {
  return getLatestPropertyDocumentByCategory(accountId, propertyId, 'Photos')
}

interface UploadTransactionDocumentInput {
  accountId: string
  propertyId: string
  transactionId: string
  category: DocumentCategory
  uploadedBy: string
  file: File
}

// Direct upload (not a move from a staging bucket) — the file the user
// picks goes straight into its permanent Documents path, same convention
// as 2.6's reconcile flow: "<account_id>/<property_id>/<category>/<filename>".
export async function uploadTransactionDocument(input: UploadTransactionDocumentInput) {
  const { accountId, propertyId, transactionId, category, uploadedBy, file } = input

  const destinationPath = `${accountId}/${propertyId}/${category}/${crypto.randomUUID()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('documents').upload(destinationPath, file)
  if (uploadError) {
    return { error: uploadError }
  }

  return supabase
    .from('documents')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      transaction_id: transactionId,
      category,
      uploaded_by: uploadedBy,
      storage_path: destinationPath,
      file_size: file.size,
    })
    .select(DOCUMENT_COLUMNS)
    .single<DocumentRecord>()
}

interface UploadPropertyDocumentInput {
  accountId: string
  propertyId: string
  category: DocumentCategory
  label: string | null
  uploadedBy: string
  file: File
}

// Roadmap 7.17 — Activity & Documents' freeform upload-or-link entry,
// upload half. Same permanent-path convention as everything else in this
// table; unlike uploadTransactionDocument, there's no transaction_id —
// this entry isn't tied to any transaction or tax installment.
export async function uploadPropertyDocument(input: UploadPropertyDocumentInput) {
  const { accountId, propertyId, category, label, uploadedBy, file } = input

  const destinationPath = `${accountId}/${propertyId}/${category}/${crypto.randomUUID()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('documents').upload(destinationPath, file)
  if (uploadError) {
    return { error: uploadError }
  }

  return supabase
    .from('documents')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      category,
      label,
      uploaded_by: uploadedBy,
      storage_path: destinationPath,
      file_size: file.size,
    })
    .select(DOCUMENT_COLUMNS)
    .single<DocumentRecord>()
}

interface CreatePropertyLinkInput {
  accountId: string
  propertyId: string
  category: DocumentCategory
  label: string | null
  uploadedBy: string
  linkUrl: string
  linkType: 'drive_folder' | null
}

// Roadmap 7.17 — the paste-a-reference-link half, entered from the
// Activity & Documents tab. No file at all: no storage_path/file_size,
// just the URL (documents_file_or_link_check enforces exactly one of
// the two shapes at the DB level). linkType distinguishes a Google
// Drive folder link from a plain reference link — same open-in-new-tab
// mechanic, different presentation.
export async function createPropertyLink(input: CreatePropertyLinkInput) {
  const { accountId, propertyId, category, label, uploadedBy, linkUrl, linkType } = input

  return supabase
    .from('documents')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      category,
      label,
      uploaded_by: uploadedBy,
      link_url: linkUrl,
      link_type: linkType,
    })
    .select(DOCUMENT_COLUMNS)
    .single<DocumentRecord>()
}

interface UploadActionItemDocumentInput {
  accountId: string
  propertyId: string | null
  actionItemId: string
  category: DocumentCategory
  uploadedBy: string
  file: File
}

// Roadmap 10.5 — action items can be account-level (no property), unlike
// every other attachable entity so far, so the path's property segment
// falls back to a fixed "account-level" folder rather than requiring a
// real property id.
export async function uploadActionItemDocument(input: UploadActionItemDocumentInput) {
  const { accountId, propertyId, actionItemId, category, uploadedBy, file } = input

  const destinationPath = `${accountId}/${propertyId ?? 'account-level'}/${category}/${crypto.randomUUID()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('documents').upload(destinationPath, file)
  if (uploadError) {
    return { error: uploadError }
  }

  return supabase
    .from('documents')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      action_item_id: actionItemId,
      category,
      uploaded_by: uploadedBy,
      storage_path: destinationPath,
      file_size: file.size,
    })
    .select(DOCUMENT_COLUMNS)
    .single<DocumentRecord>()
}

interface CreateActionItemLinkInput {
  accountId: string
  propertyId: string | null
  actionItemId: string
  category: DocumentCategory
  label: string | null
  uploadedBy: string
  linkUrl: string
}

// Roadmap 10.5 — the link half of an action item's Links & attachments,
// same shape as createPropertyLink.
export async function createActionItemLink(input: CreateActionItemLinkInput) {
  const { accountId, propertyId, actionItemId, category, label, uploadedBy, linkUrl } = input

  return supabase
    .from('documents')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      action_item_id: actionItemId,
      category,
      label,
      uploaded_by: uploadedBy,
      link_url: linkUrl,
    })
    .select(DOCUMENT_COLUMNS)
    .single<DocumentRecord>()
}

interface MoveToDocumentsInput {
  accountId: string
  propertyId: string
  category: DocumentCategory
  uploadedBy: string
  sourceBucket: string
  sourcePath: string
  fileName: string
  // Roadmap 9.9 bridge fix (found by T5) — the financial_transactions row
  // this attachment belongs to, when reconciling a Receipt. Optional
  // because not every moveToDocuments call originates from a reconcile
  // (and non-Receipt capture types never produce a transaction), but the
  // caller must pass it whenever the transaction already exists — this is
  // the only place that ever links a moved document back to the
  // transaction the Documents panel (9.6) reads by.
  transactionId?: string | null
}

// Moves a staged file (e.g. a Quick Capture attachment) into its permanent
// path in the "documents" bucket and records it in the documents table.
// Supabase Storage can't move an object across buckets atomically, so this
// downloads from the source, uploads to the destination, and only removes
// the original once both the upload and the table insert succeed — a
// failure partway through never leaves the file missing entirely.
export async function moveToDocuments(input: MoveToDocumentsInput) {
  const { accountId, propertyId, category, uploadedBy, sourceBucket, sourcePath, fileName, transactionId } = input

  const { data: downloaded, error: downloadError } = await supabase.storage
    .from(sourceBucket)
    .download(sourcePath)
  if (downloadError || !downloaded) {
    return { error: downloadError ?? new Error('Could not read source file') }
  }

  const destinationPath = `${accountId}/${propertyId}/${category}/${crypto.randomUUID()}-${fileName}`
  const { error: uploadError } = await supabase.storage.from('documents').upload(destinationPath, downloaded)
  if (uploadError) {
    return { error: uploadError }
  }

  const { data: documentRow, error: insertError } = await supabase
    .from('documents')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      transaction_id: transactionId ?? null,
      category,
      uploaded_by: uploadedBy,
      storage_path: destinationPath,
      file_size: downloaded.size,
    })
    .select()
    .single()

  if (insertError) {
    return { error: insertError }
  }

  const { error: removeError } = await supabase.storage.from(sourceBucket).remove([sourcePath])
  if (removeError) {
    return { error: removeError, data: documentRow }
  }

  return { data: documentRow, error: null }
}
