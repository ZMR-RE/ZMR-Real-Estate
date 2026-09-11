import type { DocumentRecord } from '../documents/documentsQueries'

interface PropertyProfileDocumentsTabProps {
  documents: DocumentRecord[]
  onView: (path: string) => void
}

// Read-only — documents land here via the Reconciliation Queue's move-to-
// Documents action (roadmap 2.6); there's no direct upload from this tab.
export function PropertyProfileDocumentsTab({ documents, onView }: PropertyProfileDocumentsTabProps) {
  if (documents.length === 0) {
    return <p>No documents yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Uploaded</th>
          <th>Size</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.id}>
            <td>{doc.category}</td>
            <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
            <td>{(doc.file_size / 1024).toFixed(1)} KB</td>
            <td>
              <button type="button" onClick={() => onView(doc.storage_path)}>
                View
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
