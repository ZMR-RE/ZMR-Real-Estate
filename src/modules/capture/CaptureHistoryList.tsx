import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { propertyLabel } from '../../shared/propertyLabel'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import type { VendorInput } from '../vendors/vendorsQueries'
import { CaptureEntryDetailsForm, type CaptureEntryDetailsInput } from './CaptureEntryDetailsForm'
import { isCaptureEntryComplete } from './captureCalculations'
import type { CaptureEntry, EntryType } from './captureQueries'
import type { CompleteFilter, TypeFilter } from './useCaptureHistory'

const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  receipt: 'Receipt',
  visit: 'Visit',
  communication: 'Communication',
  mileage: 'Mileage',
}

const ENTRY_TYPES: EntryType[] = ['receipt', 'visit', 'communication', 'mileage']

interface CaptureHistoryListProps {
  entries: CaptureEntry[]
  accountId: string | null
  completeFilter: CompleteFilter
  onCompleteFilterChange: (filter: CompleteFilter) => void
  typeFilter: TypeFilter
  onTypeFilterChange: (filter: TypeFilter) => void
  editingId: string | null
  onStartEditing: (id: string) => void
  onCancelEditing: () => void
  processingId: string | null
  detailsError: string | null
  vendorOptions: SearchableSelectOption[]
  onCreateVendor: (input: VendorInput) => Promise<{ id: string } | { error: string }>
  refreshVendorOptions: () => void
  onSaveDetails: (entry: CaptureEntry, input: CaptureEntryDetailsInput) => void
  onToggleManuallyCompleted: (entry: CaptureEntry) => void
  onVoid: (id: string) => void
  onViewAttachment: (path: string) => void
}

const COLUMN_COUNT = 6

// Roadmap 1.10/1.11/1.15/1.24 — Quick Capture's "History" tab (formerly
// "Recently logged"). The "Mark complete" override and remaining-field
// edit both live here (and in Reconciliation's list), never in the
// create form.
//
// 1.24 — Type and Show used to be two bare label/select pairs with no
// shared container, which visually ran together (especially at mobile
// widths). They're now one filter-bar row, each control clearly boxed
// so neither the controls nor their labels overlap. The table's headers
// (including the Complete/Reconciled split, previously one merged
// "Status" column) render unconditionally so the screen's structure is
// visible before any data exists — <thead> stays outside the entries.length
// check. The empty-state message renders as its own block below the
// table rather than inside a colSpan'd row: this app's table CSS sets
// `display: block` on <table> (for mobile horizontal scroll), which
// breaks native colSpan width-sharing between thead and a single wide
// tbody cell, so a colSpan row would render far narrower than the
// header row instead of spanning it.
export function CaptureHistoryList({
  entries,
  accountId,
  completeFilter,
  onCompleteFilterChange,
  typeFilter,
  onTypeFilterChange,
  editingId,
  onStartEditing,
  onCancelEditing,
  processingId,
  detailsError,
  vendorOptions,
  onCreateVendor,
  refreshVendorOptions,
  onSaveDetails,
  onToggleManuallyCompleted,
  onVoid,
  onViewAttachment,
}: CaptureHistoryListProps) {
  return (
    <div>
      <div className="capture-history-filter-bar">
        <div className="capture-history-filter">
          <label htmlFor="type_filter">Type</label>
          <select
            id="type_filter"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as TypeFilter)}
          >
            <option value="all">All types</option>
            {ENTRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {ENTRY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="capture-history-filter">
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
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Property</th>
              <th>Date</th>
              <th>Complete</th>
              <th>Reconciled</th>
              <th></th>
            </tr>
          </thead>
          {entries.length > 0 && (
            <tbody>
              {entries.map((entry) => {
                const complete = isCaptureEntryComplete(entry)
                return (
                  <Fragment key={entry.id}>
                    <tr className={complete ? 'capture-entry-complete' : undefined}>
                      <td>{ENTRY_TYPE_LABELS[entry.entry_type]}</td>
                      <td>{propertyLabel(entry.property)}</td>
                      <td>{entry.entry_date}</td>
                      <td>
                        <span className={`status-badge ${complete ? 'status-badge-success' : 'status-badge-warning'}`}>
                          {complete ? 'Complete' : 'Needs details'}
                        </span>
                      </td>
                      <td>
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
                        {/* Roadmap 9.9 — the capture→transaction half of the
                            bridge's traceable link; Financials doesn't
                            support deep-linking to a specific row, so this
                            goes to the page itself, findable there by date/
                            amount/category. */}
                        {entry.entry_type === 'receipt' && entry.financial_transaction_id && (
                          <Link to="/financials">View transaction</Link>
                        )}
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
                        <td colSpan={COLUMN_COUNT}>
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
          )}
        </table>
      </div>

      {entries.length === 0 && <p className="empty-state">Nothing logged yet.</p>}
    </div>
  )
}
