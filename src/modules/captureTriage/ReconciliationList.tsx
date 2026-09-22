import { Fragment } from 'react'
import type { DocumentCategory } from '../documents/documentsQueries'
import type { PickListOption } from '../../shared/pickLists/pickListsQueries'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { propertyLabel } from '../../shared/propertyLabel'
import type { VendorInput } from '../vendors/vendorsQueries'
import { CaptureEntryDetailsForm, type CaptureEntryDetailsInput } from '../capture/CaptureEntryDetailsForm'
import { isCaptureEntryComplete } from '../capture/captureCalculations'
import type { CaptureEntry, EntryType } from '../capture/captureQueries'
import type { QueueEntry } from './reconciliationQueries'

const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  receipt: 'Receipt',
  visit: 'Visit',
  communication: 'Communication',
  mileage: 'Mileage',
}

interface ReconciliationListProps {
  entries: QueueEntry[]
  accountId: string | null
  processingId: string | null
  categoryOptions: PickListOption[]
  categoryByEntry: Record<string, DocumentCategory | ''>
  onCategoryChange: (id: string, category: DocumentCategory | '') => void
  onViewAttachment: (path: string) => void
  onReconcile: (entry: QueueEntry) => void
  editingId: string | null
  onStartEditing: (id: string) => void
  onCancelEditing: () => void
  detailsError: string | null
  vendorOptions: SearchableSelectOption[]
  onCreateVendor: (input: VendorInput) => Promise<{ id: string } | { error: string }>
  refreshVendorOptions: () => void
  onSaveDetails: (entry: CaptureEntry, input: CaptureEntryDetailsInput) => void
  onToggleManuallyCompleted: (entry: CaptureEntry) => void
  onVoid: (id: string) => void
}

export function ReconciliationList({
  entries,
  accountId,
  processingId,
  categoryOptions,
  categoryByEntry,
  onCategoryChange,
  onViewAttachment,
  onReconcile,
  editingId,
  onStartEditing,
  onCancelEditing,
  detailsError,
  vendorOptions,
  onCreateVendor,
  refreshVendorOptions,
  onSaveDetails,
  onToggleManuallyCompleted,
  onVoid,
}: ReconciliationListProps) {
  if (entries.length === 0) {
    return <p className="empty-state">Nothing to reconcile.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Date</th>
            <th>Property</th>
            <th>Status</th>
            <th>Attachments</th>
            <th>Document category</th>
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
                    </span>
                  </td>
                  <td>
                    {entry.attachments.length === 0
                      ? '—'
                      : entry.attachments.map((a) => (
                          <button key={a.id} type="button" onClick={() => onViewAttachment(a.storage_path)}>
                            View {a.attachment_type}
                          </button>
                        ))}
                  </td>
                  <td>
                    {entry.attachments.length > 0 && (
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
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={
                        processingId === entry.id ||
                        !complete ||
                        (entry.attachments.length > 0 && !categoryByEntry[entry.id])
                      }
                      onClick={() => onReconcile(entry)}
                    >
                      {processingId === entry.id ? 'Moving…' : 'Reconcile'}
                    </button>
                    <button type="button" disabled={processingId === entry.id} onClick={() => onStartEditing(entry.id)}>
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
                  </td>
                </tr>
                {editingId === entry.id && (
                  <tr>
                    <td colSpan={7}>
                      <CaptureEntryDetailsForm
                        entry={entry}
                        accountId={accountId}
                        saving={processingId === entry.id}
                        error={detailsError}
                        vendorOptions={vendorOptions}
                        onCreateVendor={onCreateVendor}
                        refreshVendorOptions={refreshVendorOptions}
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
    </div>
  )
}
