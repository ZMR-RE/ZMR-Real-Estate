import type { DocumentRecord } from '../documents/documentsQueries'
import { DocumentLibrarySection } from '../documents/DocumentLibrarySection'
import { useDocumentLibrary } from '../documents/useDocumentLibrary'
import { useAuth } from '../../shared/auth/AuthContext'
interface PropertyProfileDocumentsTabProps {
  propertyId: string
  documents: DocumentRecord[]
  onView: (path: string) => void
  onDocumentsChanged: () => Promise<void>
}
export function PropertyProfileDocumentsTab(props: PropertyProfileDocumentsTabProps) {
  const { accountId } = useAuth()
  return <DocumentLibrary key={`${accountId}:${props.propertyId}`} {...props} />
}
function DocumentLibrary({ propertyId, documents, onView, onDocumentsChanged }: PropertyProfileDocumentsTabProps) {
  const { rows, notice, add, edit } = useDocumentLibrary(propertyId, documents, onDocumentsChanged)
  return <>
    {notice && <p role="status">{notice}</p>}
    <DocumentLibrarySection kind="links" documents={rows} onView={onView} onAdd={add} onEdit={edit}/>
    <DocumentLibrarySection kind="files" documents={rows} onView={onView} onAdd={add} onEdit={edit}/>
  </>
}
