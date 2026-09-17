import { useDocumentLinks, filterOverviewDocumentLinks } from './useDocumentLinks'
import { DocumentLinkForm } from './DocumentLinkForm'
import { DocumentLinkList } from './DocumentLinkList'
import type { DocumentRecord } from './documentsQueries'

interface DocumentLinksSectionProps {
  propertyId: string
  documents: DocumentRecord[]
  onViewDocument: (path: string) => void
  onDocumentsChanged: () => Promise<void>
}

// Roadmap 7.17 — freeform documents/links, not tied to a transaction or
// tax installment (those already have their own dedicated upload paths
// on Financials and the Property tax installments box).
export function DocumentLinksSection({ propertyId, documents, onViewDocument, onDocumentsChanged }: DocumentLinksSectionProps) {
  const { isAdding, saving, error, startAdding, cancelAdding, add } = useDocumentLinks(propertyId, onDocumentsChanged)
  const overviewDocuments = filterOverviewDocumentLinks(documents)

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <DocumentLinkList documents={overviewDocuments} onViewDocument={onViewDocument} />

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
