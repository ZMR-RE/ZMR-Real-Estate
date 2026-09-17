import { Fragment } from 'react'
import { propertyLabel } from '../../shared/propertyLabel'
import { CaptureEntryDetailsForm, type CaptureEntryDetailsInput } from './CaptureEntryDetailsForm'
import { isCaptureEntryComplete } from './captureCalculations'
import type { CaptureEntry, EntryType } from './captureQueries'
import type { CompleteFilter } from './useRecentCaptures'

const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  receipt: 'Receipt',
  visit: 'Visit',
  communication: 'Communication',
  mileage: 'Mileage',
}

interface RecentCaptureListProps {
  entries: CaptureEntry[]
  completeFilter: CompleteFilter
  onCompleteFilterChange: (filter: CompleteFilter) => void
  editingId: string | null
  onStartEditing: (id: string) => void
  onCancelEditing: () => void
  processingId: string | null
  detailsError: string | null
  onSaveDetails: (entry: CaptureEntry, input: CaptureEntryDetailsInput) => void
  onToggleManuallyCompleted: (entry: CaptureEntry) => void
  onVoid: (id: string) => void
  onViewAttachment: (path: string) => void
}

// Roadmap 1.10/1.11 — Quick Capture's "Recently logged" list. The "Mark
// complete" override and remaining-field edit both live here (and in
// Reconciliation's list), never in the create form above it.
export function RecentCaptureList({
  entries,
  completeFilter,
  onCompleteFilterChange,
  editingId,
  onStartEditing,
  onCancelEditing,
  processingId,
  detailsError,
  onSaveDetails,
  onToggleManuallyCompleted,
  onVoid,
  onViewAttachment,
}: RecentCaptureListProps) {
  return (
    <div>
      <h2>Recently logged</h2>

      <label htmlFor="complete_filter">Show</label>
      <select
        id="complete_filter"
        value={completeFilter}
        onChange={(e) => onCompleteFilterChange(e.target.value as CompleteFilter)}
      >
        <option value="all">All</option>
        <option value="complete">Complete</option>
        <option value="needs_details">Needs details</option>
      </select>

      {entries.length === 0 ? (
        <p className="empty-state">Nothing logged yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Date</th>
              <th>Property</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const complete = isCaptureEntryComplete(entry)
              return (
                <Fragment key={entry.id}>
                  <tr className={complete ? 'capture-entry-complete' : undefined}>
                    <td>{ENTRY_TYPE_LABELS[entry.entry_type]}</td>
                    <td>{entry.entry_date}</td>
                    <td>{propertyLabel(entry.property)}</td>
                    <td>
                      <span className={`status-badge ${complete ? 'status-badge-success' : 'status-badge-warning'}`}>
                        {complete ? 'Complete' : 'Needs details'}
                      </span>{' '}
                      <span className={`status-badge ${entry.reconciled ? 'status-badge-success' : 'status-badge-neutral'}`}>
                        {entry.reconciled ? 'Reconciled' : 'Not reconciled'}
                      </span>
                    </td>
                    <td>
                      {entry.attachments.map((a) => (
                        <button key={a.id} type="button" onClick={() => onViewAttachment(a.storage_path)}>
                          View {a.attachment_type}
                        </button>
                      ))}
                      {!entry.reconciled && (
                        <>
                          <button
                            type="button"
                            disabled={processingId === entry.id}
                            onClick={() => onStartEditing(entry.id)}
                          >
                            {editingId === entry.id ? 'Editing…' : 'Add details'}
                          </button>
                          {!complete && (
                            <button
                              type="button"
                              disabled={processingId === entry.id}
                              onClick={() => onToggleManuallyCompleted(entry)}
                            >
                              Mark complete
                            </button>
                          )}
                          <button type="button" disabled={processingId === entry.id} onClick={() => onVoid(entry.id)}>
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {editingId === entry.id && (
                    <tr>
                      <td colSpan={5}>
                        <CaptureEntryDetailsForm
                          entry={entry}
                          saving={processingId === entry.id}
                          error={detailsError}
                          onSave={(input) => onSaveDetails(entry, input)}
                          onCancel={onCancelEditing}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
