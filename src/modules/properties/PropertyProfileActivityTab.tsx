import { getAttachmentSignedUrl } from '../reconciliation/reconciliationQueries'
import type { ActivityLogEntry } from '../capture/captureQueries'

interface PropertyProfileActivityTabProps {
  entries: ActivityLogEntry[]
}

export function PropertyProfileActivityTab({ entries }: PropertyProfileActivityTabProps) {
  if (entries.length === 0) {
    return <p>No visits or communications logged for this property yet.</p>
  }

  const viewAttachment = async (path: string) => {
    const { data, error } = await getAttachmentSignedUrl(path)
    if (error || !data) return
    window.open(data.signedUrl, '_blank')
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Notes</th>
          <th>Attachment</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.entry_date}</td>
            <td>{entry.entry_type === 'visit' ? 'Visit' : 'Communication'}</td>
            <td>{entry.notes ?? ''}</td>
            <td>
              <button type="button" onClick={() => viewAttachment(entry.attachment_path)}>
                View {entry.attachment_type}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
