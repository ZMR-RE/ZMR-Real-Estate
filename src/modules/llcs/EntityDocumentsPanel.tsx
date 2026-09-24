import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import {
  createEntityLink,
  getDocumentSignedUrl,
  listDocumentsForLlc,
  type DocumentRecord,
} from '../documents/documentsQueries'

interface EntityDocumentsPanelProps {
  llcId: string
}

// Phase 1 only (implementation contract §8): reference-link documents,
// via document_owner_links (a document can be linked to more than one
// entity — see that migration — though this panel only offers "this
// entity" as the recipient for now; multi-entity selection is later UI
// work). Actual file upload (Phase 2, D2-D4) is deliberately NOT offered
// here — the hosted Supabase Storage per-file limit is still unverified,
// and presenting a working-looking upload control that can't be trusted
// to persist correctly would be worse than omitting it. This is not a
// broken feature; it is Phase 1 of a phased rollout, working as designed.
export function EntityDocumentsPanel({ llcId }: EntityDocumentsPanelProps) {
  const { accountId, session } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState('')
  const [label, setLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listDocumentsForLlc(accountId, llcId)
    setLoading(false)
    if (fetchError) {
      setError((fetchError as { message?: string }).message ?? 'Could not load documents')
      return
    }
    setError(null)
    setDocuments(data ?? [])
  }, [accountId, llcId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleAddLink = async () => {
    if (!accountId || !session || !linkUrl.trim() || !category) return
    setSaving(true)
    const { error: linkError } = await createEntityLink({
      accountId,
      llcIds: [llcId],
      category,
      label: label.trim() || null,
      uploadedBy: session.user.id,
      linkUrl: linkUrl.trim(),
    })
    setSaving(false)
    if (linkError) {
      setError((linkError as { message?: string }).message ?? 'Could not add link')
      return
    }
    setError(null)
    setLinkUrl('')
    setLabel('')
    await refresh()
  }

  const handleView = async (doc: DocumentRecord) => {
    if (doc.link_url) {
      window.open(doc.link_url, '_blank')
      return
    }
    const { data, error: urlError } = await getDocumentSignedUrl(doc.storage_path!)
    if (urlError || !data) {
      setError('Could not load document')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : documents.length === 0 ? (
        <p className="empty-state">No documents yet.</p>
      ) : (
        <ul>
          {documents.map((doc) => (
            <li key={doc.id}>
              <button type="button" onClick={() => handleView(doc)}>
                {doc.link_url
                  ? `${doc.label || doc.link_url} (${doc.category})`
                  : `${doc.label || doc.category} (${((doc.file_size ?? 0) / 1024).toFixed(1)} KB)`}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h4 className="property-details-title">Add a reference link</h4>
      <div className="field-column">
        <label htmlFor="entity_doc_category">Category</label>
        <PickListSelect
          id="entity_doc_category"
          listName="document_type"
          title="Document types"
          value={category}
          onChange={setCategory}
          placeholder="Select category…"
        />
        <label htmlFor="entity_doc_link">Link URL</label>
        <input
          id="entity_doc_link"
          type="url"
          placeholder="https://…"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />
        <label htmlFor="entity_doc_label">Label</label>
        <input id="entity_doc_label" placeholder="Optional label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button type="button" disabled={saving || !linkUrl.trim() || !category} onClick={handleAddLink}>
          {saving ? 'Saving…' : 'Add link'}
        </button>
      </div>

      <p>
        File upload isn&rsquo;t available here yet — the hosted storage per-file limit hasn&rsquo;t been verified. Existing
        files uploaded elsewhere in the app remain viewable above; reference links work now.
      </p>
    </div>
  )
}
