import type { DocumentRecord } from '../documents/documentsQueries'
import { useDocumentLinks } from '../documents/useDocumentLinks'
import { DocumentLinkForm } from '../documents/DocumentLinkForm'

interface PropertyProfileDocumentsTabProps {
  propertyId: string
  documents: DocumentRecord[]
  onView: (path: string) => void
  onDocumentsChanged: () => Promise<void>
}

// Most documents land here via the Reconciliation Queue's move-to-Documents
// action (roadmap 2.6) or a category's own upload (transaction receipts,
// tax installments). Roadmap 7.17's freeform upload-or-link entry also
// writes into this same table — including link-only entries with no
// file, so Size shows "—" for those — and lives right here (its own
// standalone Overview section was removed per the Single source of
// truth rule: one place to see every document, one place to add one).
export function PropertyProfileDocumentsTab({ propertyId, documents, onView, onDocumentsChanged }: PropertyProfileDocumentsTabProps) {
  const { isAdding, saving, error, startAdding, cancelAdding, add } = useDocumentLinks(propertyId, onDocumentsChanged)

  return (
    <div>
      {documents.length === 0 ? (
        <p className="empty-state">No documents yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>Category</th>
              <th>Added</th>
              <th>Size</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.label ?? '—'}</td>
                <td>{doc.category}</td>
                <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                <td>{doc.file_size !== null ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}</td>
                <td>
                  {doc.link_url ? (
                    <a href={doc.link_url} target="_blank" rel="noopener noreferrer">
                      {doc.link_type === 'drive_folder' ? 'Open in Drive' : 'Open link'}
                    </a>
                  ) : (
                    <button type="button" onClick={() => onView(doc.storage_path!)}>
                      View
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && <p role="alert">{error}</p>}
      {isAdding ? (
        <DocumentLinkForm saving={saving} onSave={add} onCancel={cancelAdding} />
      ) : (
        <button type="button" onClick={startAdding}>
          + Add document or link
        </button>
      )}
    </div>
  )
}
