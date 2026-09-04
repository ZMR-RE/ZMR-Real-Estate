import type { QueueEntry } from './reconciliationQueries'

interface ReconciliationListProps {
  entries: QueueEntry[]
  processingId: string | null
  onViewAttachment: (path: string) => void
  onReconcile: (id: string) => void
}

export function ReconciliationList({
  entries,
  processingId,
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
              <button
                type="button"
                disabled={processingId === entry.id}
                onClick={() => onReconcile(entry.id)}
              >
                {processingId === entry.id ? 'Marking…' : 'Mark reconciled'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
