import { useMemo, useState } from 'react'
import { EditableSection } from '../../shared/EditableSection'
import type { DocumentRecord } from '../documents/documentsQueries'
import { useDocumentLinks } from '../documents/useDocumentLinks'
import { DocumentLinkForm } from '../documents/DocumentLinkForm'

interface PropertyProfileDocumentsTabProps {
  propertyId: string
  documents: DocumentRecord[]
  onView: (path: string) => void
  onDocumentsChanged: () => Promise<void>
}

const PAGE_SIZE_OPTIONS = [25, 50] as const

// Most documents land here via the Reconciliation Queue's move-to-Documents
// action (roadmap 2.6) or a category's own upload (transaction receipts,
// tax installments). Roadmap 7.17's freeform upload-or-link entry also
// writes into this same table — including link-only entries with no
// file, so Size shows "—" for those — and lives right here (its own
// standalone Overview section was removed per the Single source of
// truth rule: one place to see every document, one place to add one).
//
// Roadmap 7.28 — converted to the Box interaction standard's
// EditableSection: "+ Add document or link" used to sit as a standing
// header action, visible regardless of state — now it only appears once
// this box's own Edit is clicked, same single-entry-point rule every
// other converted box follows. The search bar, pagination, and each
// row's View/Open link action stay visible in both states — those are
// viewing/filtering concerns, not edit actions (same precedent as
// Insurance's per-document "View document" buttons, which aren't
// readOnly-gated either).
export function PropertyProfileDocumentsTab({ propertyId, documents, onView, onDocumentsChanged }: PropertyProfileDocumentsTabProps) {
  const { isAdding, saving, error, startAdding, cancelAdding, add } = useDocumentLinks(propertyId, onDocumentsChanged)
  const [searchQuery, setSearchQuery] = useState('')
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25)
  const [page, setPage] = useState(1)

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return documents
    return documents.filter(
      (doc) => (doc.label ?? '').toLowerCase().includes(query) || doc.category.toLowerCase().includes(query),
    )
  }, [documents, searchQuery])

  const pageCount = Math.max(1, Math.ceil(filteredDocuments.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pagedDocuments = filteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const documentsList = (
    <>
      {documents.length > 0 && (
        <div className="documents-filter-bar">
          <div className="documents-filter">
            <label htmlFor="document_search">Search</label>
            <input
              id="document_search"
              type="text"
              placeholder="Search by label or category…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="documents-filter">
            <label htmlFor="document_page_size">Show</label>
            <select
              id="document_page_size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                setPage(1)
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} at a time
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="empty-state">No documents yet.</p>
      ) : filteredDocuments.length === 0 ? (
        <p className="empty-state">No documents match "{searchQuery}".</p>
      ) : (
        <>
          <div className="table-scroll">
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
                {pagedDocuments.map((doc) => (
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
          </div>

          {pageCount > 1 && (
            <div className="documents-pagination">
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                Previous
              </button>
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </>
  )

  return (
    <EditableSection
      title="Documents"
      onEditStart={cancelAdding}
      view={documentsList}
      edit={(exitEditing) => (
        <>
          {documentsList}
          {error && <p role="alert">{error}</p>}
          {isAdding ? (
            <DocumentLinkForm saving={saving} onSave={add} onCancel={cancelAdding} />
          ) : (
            <button type="button" onClick={startAdding}>
              + Add document or link
            </button>
          )}
          <button type="button" onClick={exitEditing}>
            Done
          </button>
        </>
      )}
    />
  )
}
