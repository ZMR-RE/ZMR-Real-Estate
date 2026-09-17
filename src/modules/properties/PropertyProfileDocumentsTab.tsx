import type { DocumentRecord } from '../documents/documentsQueries'

interface PropertyProfileDocumentsTabProps {
  documents: DocumentRecord[]
  onView: (path: string) => void
}

// Read-only — most documents land here via the Reconciliation Queue's
// move-to-Documents action (roadmap 2.6) or a category's own upload
// (transaction receipts, tax installments); roadmap 7.17's Documents &
// links section on Overview also writes into this same table, including
// link-only entries with no file, so Size shows "—" for those.
export function PropertyProfileDocumentsTab({ documents, onView }: PropertyProfileDocumentsTabProps) {
  if (documents.length === 0) {
    return <p className="empty-state">No documents yet.</p>
  }

  return (
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
                  Open link
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
  )
}
