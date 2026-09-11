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
  storage_path: string
  file_size: number
  uploaded_at: string
}

export async function listDocuments(accountId: string, propertyId: string) {
  return supabase
    .from('documents')
    .select('id, property_id, transaction_id, category, storage_path, file_size, uploaded_at')
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
    .select('id, property_id, transaction_id, category, storage_path, file_size, uploaded_at')
    .eq('account_id', accountId)
    .eq('transaction_id', transactionId)
    .order('uploaded_at', { ascending: false })
    .returns<DocumentRecord[]>()
}

export async function getDocumentSignedUrl(path: string) {
  return supabase.storage.from('documents').createSignedUrl(path, 60)
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
    .select('id, property_id, transaction_id, category, storage_path, file_size, uploaded_at')
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
}

// Moves a staged file (e.g. a Quick Capture attachment) into its permanent
// path in the "documents" bucket and records it in the documents table.
// Supabase Storage can't move an object across buckets atomically, so this
// downloads from the source, uploads to the destination, and only removes
// the original once both the upload and the table insert succeed — a
// failure partway through never leaves the file missing entirely.
export async function moveToDocuments(input: MoveToDocumentsInput) {
  const { accountId, propertyId, category, uploadedBy, sourceBucket, sourcePath, fileName } = input

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
