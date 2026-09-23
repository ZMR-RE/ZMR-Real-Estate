import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import {
  createActionItemLink,
  getDocumentSignedUrl,
  listDocumentsForActionItem,
  uploadActionItemDocument,
  type DocumentRecord,
} from '../documents/documentsQueries'

interface ActionItemDocumentsProps {
  actionItemId: string
  propertyId: string | null
}

// Roadmap 10.5 — an action item's "links" and "file attachments" are one
// combined list (the documents table already supports a file-or-link row
// generically), same reused mechanism as TransactionDocuments.tsx
// (roadmap 9.6). propertyId is nullable here (unlike every other caller
// of this table so far) since an action item can be account-level.
export function ActionItemDocuments({ actionItemId, propertyId }: ActionItemDocumentsProps) {
  const { accountId, session } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [resetKey, setResetKey] = useState(0)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listDocumentsForActionItem(accountId, actionItemId)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setDocuments(data ?? [])
  }, [accountId, actionItemId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleUpload = async () => {
    if (!accountId || !session || !file || !category) return
    setSaving(true)
    const { error: uploadError } = await uploadActionItemDocument({
      accountId,
      propertyId,
      actionItemId,
      category,
      uploadedBy: session.user.id,
      file,
    })
    setSaving(false)
    if (uploadError) {
      setError(uploadError.message ?? 'Could not upload file')
      return
    }
    setError(null)
    setFile(null)
    setResetKey((k) => k + 1)
    await refresh()
  }

  const handleAddLink = async () => {
    if (!accountId || !session || !linkUrl.trim() || !category) return
    setSaving(true)
    const { error: linkError } = await createActionItemLink({
      accountId,
      propertyId,
      actionItemId,
      category,
      label: linkLabel.trim() || null,
      uploadedBy: session.user.id,
      linkUrl: linkUrl.trim(),
    })
    setSaving(false)
    if (linkError) {
      setError(linkError.message ?? 'Could not add link')
      return
    }
    setError(null)
    setLinkUrl('')
    setLinkLabel('')
    await refresh()
  }

  const handleView = async (doc: DocumentRecord) => {
    if (doc.link_url) {
      window.open(doc.link_url, '_blank')
      return
    }
    const { data, error: urlError } = await getDocumentSignedUrl(doc.storage_path!)
    if (urlError || !data) {
      setError(urlError?.message ?? 'Could not load document')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="action-item-documents">
      {/* Roadmap 7.48 — DESIGN-SYSTEM.md's pattern for a second-tier
          heading inside an already-titled context (ActionItemDetail's
          own item title) is .property-details-title, not a bare <h4>. */}
      <h4 className="property-details-title">Links &amp; attachments</h4>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : documents.length === 0 ? (
        <p className="empty-state">No links or attachments yet.</p>
      ) : (
        <ul className="action-item-documents-list">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button type="button" onClick={() => handleView(doc)}>
                {doc.link_url
                  ? `${doc.label || doc.link_url} (${doc.category})`
                  : `${doc.category} (${(doc.file_size! / 1024).toFixed(1)} KB)`}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="action-item-documents-add">
        <label htmlFor={`action_item_doc_category_${actionItemId}`}>Category</label>
        <PickListSelect
          id={`action_item_doc_category_${actionItemId}`}
          listName="document_type"
          title="Document types"
          value={category}
          onChange={setCategory}
          placeholder="Select category…"
        />

        <label htmlFor={`action_item_doc_file_${actionItemId}`}>Attach a file</label>
        <input
          key={resetKey}
          id={`action_item_doc_file_${actionItemId}`}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="button" disabled={saving || !file || !category} onClick={handleUpload}>
          {saving ? 'Saving…' : 'Attach file'}
        </button>

        <label htmlFor={`action_item_doc_link_${actionItemId}`}>Or add a link</label>
        <input
          id={`action_item_doc_link_${actionItemId}`}
          type="url"
          placeholder="https://…"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />
        <input
          type="text"
          placeholder="Label (optional)"
          value={linkLabel}
          onChange={(e) => setLinkLabel(e.target.value)}
        />
        <button type="button" disabled={saving || !linkUrl.trim() || !category} onClick={handleAddLink}>
          {saving ? 'Saving…' : 'Add link'}
        </button>
      </div>
    </div>
  )
}
