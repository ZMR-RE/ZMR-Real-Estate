import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import {
  getDocumentSignedUrl,
  listDocumentsForTransaction,
  uploadTransactionDocument,
  type DocumentRecord,
} from '../documents/documentsQueries'

interface TransactionDocumentsProps {
  transactionId: string
  propertyId: string
}

// Roadmap 9.6 — per-transaction document attachment, built on the 2.5
// document storage architecture (documents.transaction_id already existed
// as a column, unused until now). A real upload, not a link field.
export function TransactionDocuments({ transactionId, propertyId }: TransactionDocumentsProps) {
  const { accountId, session } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listDocumentsForTransaction(accountId, transactionId)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setDocuments(data ?? [])
  }, [accountId, transactionId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleUpload = async () => {
    if (!accountId || !session || !file || !category) return
    setUploading(true)
    const { error: uploadError } = await uploadTransactionDocument({
      accountId,
      propertyId,
      transactionId,
      category,
      uploadedBy: session.user.id,
      file,
    })
    setUploading(false)
    if (uploadError) {
      setError(uploadError.message ?? 'Could not upload document')
      return
    }
    setError(null)
    setFile(null)
    setResetKey((k) => k + 1)
    await refresh()
  }

  const handleView = async (path: string) => {
    const { data, error: urlError } = await getDocumentSignedUrl(path)
    if (urlError || !data) {
      setError(urlError?.message ?? 'Could not load document')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="transaction-documents">
      <h4>Documents</h4>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : documents.length === 0 ? (
        <p>No documents attached yet.</p>
      ) : (
        <ul className="transaction-documents-list">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button type="button" onClick={() => handleView(doc.storage_path)}>
                {doc.category} ({(doc.file_size / 1024).toFixed(1)} KB)
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="transaction-documents-upload">
        <PickListSelect
          id={`transaction_document_category_${transactionId}`}
          listName="document_type"
          title="Document types"
          value={category}
          onChange={setCategory}
          placeholder="Select document type…"
        />
        <input
          key={resetKey}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="button" disabled={uploading || !file || !category} onClick={handleUpload}>
          {uploading ? 'Uploading…' : 'Attach document'}
        </button>
      </div>
    </div>
  )
}
