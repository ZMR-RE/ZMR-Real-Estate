import type { InsurancePolicyDocument } from './insuranceQueries'

interface InsurancePolicyDocumentsListProps {
  documents: InsurancePolicyDocument[]
  onViewDocument: (path: string) => void
}

// INS-1 — shared between the view-mode compact expandable Documents
// area (InsuranceLedgerList) and the Edit form's existing-documents list
// (InsurancePolicyForm), so both read the same real upload date rather
// than one showing it and the other showing a generic "View document 1/
// 2" ordinal (the only label the old view mode had — an ordinal is not
// a fabricated label, but the upload date is a more honest one that was
// already available and already used in Edit mode).
export function InsurancePolicyDocumentsList({ documents, onViewDocument }: InsurancePolicyDocumentsListProps) {
  if (documents.length === 0) return null

  return (
    <ul className="insurance-policy-documents">
      {documents.map((doc) => (
        <li key={doc.id}>
          <button type="button" onClick={() => onViewDocument(doc.storage_path)}>
            View document (uploaded {new Date(doc.uploaded_at).toLocaleDateString()})
          </button>
        </li>
      ))}
    </ul>
  )
}
