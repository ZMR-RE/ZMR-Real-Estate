import { DOCUMENT_CATEGORIES, type DocumentCategory } from '../documents/documentsQueries'
import type { QueueEntry } from './reconciliationQueries'

interface ReconciliationListProps {
  entries: QueueEntry[]
  processingId: string | null
  categoryByEntry: Record<string, DocumentCategory | ''>
  onCategoryChange: (id: string, category: DocumentCategory | '') => void
  onViewAttachment: (path: string) => void
  onReconcile: (entry: QueueEntry) => void
}

export function ReconciliationList({
  entries,
  processingId,
  categoryByEntry,
  onCategoryChange,
  onViewAttachment,
  onReconcile,
}: ReconciliationListProps) {
  if (entries.length === 0) {
    return <p>Nothing to reconcile.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Date</th>
          <th>Property</th>
          <th>Attachment</th>
          <th>Document category</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.entry_type}</td>
            <td>{entry.entry_date}</td>
            <td>{entry.property?.name ?? '—'}</td>
            <td>
              <button type="button" onClick={() => onViewAttachment(entry.attachment_path)}>
                View {entry.attachment_type}
              </button>
            </td>
            <td>
              <select
                value={categoryByEntry[entry.id] ?? ''}
                onChange={(e) => onCategoryChange(entry.id, e.target.value as DocumentCategory | '')}
              >
                <option value="">Select category…</option>
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <button
                type="button"
                disabled={processingId === entry.id || !categoryByEntry[entry.id]}
                onClick={() => onReconcile(entry)}
              >
                {processingId === entry.id ? 'Moving…' : 'Move to Documents & reconcile'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
