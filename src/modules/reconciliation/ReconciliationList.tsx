import type { DocumentCategory } from '../documents/documentsQueries'
import type { PickListOption } from '../../shared/pickLists/pickListsQueries'
import { propertyLabel } from '../../shared/propertyLabel'
import type { QueueEntry } from './reconciliationQueries'

interface ReconciliationListProps {
  entries: QueueEntry[]
  processingId: string | null
  categoryOptions: PickListOption[]
  categoryByEntry: Record<string, DocumentCategory | ''>
  onCategoryChange: (id: string, category: DocumentCategory | '') => void
  onViewAttachment: (path: string) => void
  onReconcile: (entry: QueueEntry) => void
}

export function ReconciliationList({
  entries,
  processingId,
  categoryOptions,
  categoryByEntry,
  onCategoryChange,
  onViewAttachment,
  onReconcile,
}: ReconciliationListProps) {
  if (entries.length === 0) {
    return <p className="empty-state">Nothing to reconcile.</p>
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
            <td>{propertyLabel(entry.property)}</td>
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
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.value}>
                    {category.value}
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
