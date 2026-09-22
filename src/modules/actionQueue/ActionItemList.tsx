import { propertyLabel } from '../../shared/propertyLabel'
import { actionItemPriority } from './actionItemPriority'
import type { ActionItem } from './actionItemsQueries'

interface ActionItemListProps {
  items: ActionItem[]
  processingId: string | null
  onComplete: (item: ActionItem) => void
  showProperty?: boolean
}

export function ActionItemList({ items, processingId, onComplete, showProperty = true }: ActionItemListProps) {
  if (items.length === 0) {
    return <p className="empty-state">Nothing here.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            {showProperty && <th>Property</th>}
            <th>Due date</th>
            <th>Repeats</th>
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
  
            return (
              <tr key={item.id} className={priority !== 'normal' ? `action-item-${priority}` : undefined}>
                <td>
                  {item.title}
                  {item.unit && ` — ${item.unit.unit_label}`}
                </td>
                {showProperty && <td>{item.property ? propertyLabel(item.property) : 'Account-level'}</td>}
                <td>
                  {item.due_date}
                  {priorityNote}
                </td>
                <td>{item.recurrence === 'none' ? '—' : item.recurrence}</td>
                <td>
                  <button type="button" disabled={processingId === item.id} onClick={() => onComplete(item)}>
                    {processingId === item.id ? 'Completing…' : 'Complete'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
