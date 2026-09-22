import { Fragment } from 'react'
import { propertyLabel } from '../../shared/propertyLabel'
import { actionItemPriority } from './actionItemPriority'
import { ActionItemDetail } from './ActionItemDetail'
import type { ActionItem, ActionItemInput } from './actionItemsQueries'
import type { DueDateSort } from './useActionQueueFilters'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'

const COLUMN_COUNT = 7

interface ActionQueueListProps {
  items: ActionItem[]
  propertyOptions: SearchableSelectOption[]
  memberOptions: SearchableSelectOption[]
  processingId: string | null
  saving: boolean
  dueDateSort: DueDateSort
  onDueDateSortChange: (sort: DueDateSort) => void
  selectedItemId: string | null
  onSelect: (id: string | null) => void
  onComplete: (item: ActionItem) => void
  onReopen: (item: ActionItem) => void
  onSaveEdit: (id: string, input: ActionItemInput) => void
}

// Roadmap 10.5 — the flat, sortable/filterable list replacing 10.2's
// collapsible-boxes-grouped-by-type board. No Overdue/Due-this-week
// grouping either — 7.15's priority row coloring already carries that
// signal, so a second grouped structure would be redundant. Clicking a
// row expands the full detail view inline below it (same Fragment/
// expand-in-row convention as Quick Capture History, Reconciliation,
// and Property Specs — this app has no modal anywhere, so a click-
// through detail follows that established shape rather than inventing
// one), never a second differently-shaped panel.
export function ActionQueueList({
  items,
  propertyOptions,
  memberOptions,
  processingId,
  saving,
  dueDateSort,
  onDueDateSortChange,
  selectedItemId,
  onSelect,
  onComplete,
  onReopen,
  onSaveEdit,
}: ActionQueueListProps) {
  if (items.length === 0) {
    return <p className="empty-state">Nothing here.</p>
  }

  const assigneeLabel = (id: string | null) => (id ? (memberOptions.find((m) => m.id === id)?.label ?? id) : '—')

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Property</th>
            <th>Type</th>
            <th>
              <button
                type="button"
                className="action-queue-sort-button"
                onClick={() => onDueDateSortChange(dueDateSort === 'asc' ? 'desc' : 'asc')}
              >
                Due date {dueDateSort === 'asc' ? '↑' : '↓'}
              </button>
            </th>
            <th>Assignee</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const priority = actionItemPriority(item)
            const priorityNote =
              priority === 'red'
                ? item.property?.status === 'sold'
                  ? ' (property sold)'
                  : ' (overdue)'
                : priority === 'yellow'
                  ? ' (due soon)'
                  : ''
            const isSelected = selectedItemId === item.id

            return (
              <Fragment key={item.id}>
                <tr
                  className={`action-queue-row${priority !== 'normal' && !item.completed ? ` action-item-${priority}` : ''}${item.completed ? ' row-voided' : ''}`}
                  onClick={() => onSelect(isSelected ? null : item.id)}
                >
                  <td>
                    {item.title}
                    {item.unit && ` — ${item.unit.unit_label}`}
                  </td>
                  <td>{item.property ? propertyLabel(item.property) : 'Account-level'}</td>
                  <td>{item.type ?? '—'}</td>
                  <td>
                    {item.due_date}
                    {priorityNote}
                  </td>
                  <td>{assigneeLabel(item.assignee)}</td>
                  <td>
                    <span className={`status-badge ${item.completed ? 'status-badge-success' : 'status-badge-neutral'}`}>
                      {item.completed ? 'Completed' : 'Open'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {item.completed ? (
                      <button type="button" disabled={processingId === item.id} onClick={() => onReopen(item)}>
                        {processingId === item.id ? 'Reopening…' : 'Reopen'}
                      </button>
                    ) : (
                      <button type="button" disabled={processingId === item.id} onClick={() => onComplete(item)}>
                        {processingId === item.id ? 'Completing…' : 'Complete'}
                      </button>
                    )}
                  </td>
                </tr>
                {isSelected && (
                  <tr>
                    <td colSpan={COLUMN_COUNT}>
                      <ActionItemDetail
                        item={item}
                        propertyOptions={propertyOptions}
                        memberOptions={memberOptions}
                        saving={saving}
                        onSaveEdit={(input) => onSaveEdit(item.id, input)}
                        onClose={() => onSelect(null)}
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
