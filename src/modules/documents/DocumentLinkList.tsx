import type { DocumentRecord } from './documentsQueries'

interface DocumentLinkListProps {
  documents: DocumentRecord[]
  onViewDocument: (path: string) => void
}

export function DocumentLinkList({ documents, onViewDocument }: DocumentLinkListProps) {
  if (documents.length === 0) {
    return <p className="empty-state">No documents or links yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th>Category</th>
          <th>Added</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.id}>
            <td>{doc.label ?? '—'}</td>
            <td>{doc.category}</td>
            <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
            <td>
              {doc.link_url ? (
                <a href={doc.link_url} target="_blank" rel="noopener noreferrer">
                  Open link
                </a>
              ) : (
                <button type="button" onClick={() => onViewDocument(doc.storage_path!)}>
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
