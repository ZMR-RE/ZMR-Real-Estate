import { propertyLabel } from '../../shared/propertyLabel'
import type { ActionItem } from './actionItemsQueries'

interface ActionItemListProps {
  items: ActionItem[]
  processingId: string | null
  onComplete: (item: ActionItem) => void
  showProperty?: boolean
}

export function ActionItemList({ items, processingId, onComplete, showProperty = true }: ActionItemListProps) {
  if (items.length === 0) {
    return <p>Nothing here.</p>
  }

  return (
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
        {items.map((item) => (
          <tr key={item.id}>
            <td>
              {item.title}
              {item.unit && ` — ${item.unit.unit_label}`}
            </td>
            {showProperty && <td>{item.property ? propertyLabel(item.property) : 'Account-level'}</td>}
            <td>{item.due_date}</td>
            <td>{item.recurrence === 'none' ? '—' : item.recurrence}</td>
            <td>
              <button type="button" disabled={processingId === item.id} onClick={() => onComplete(item)}>
                {processingId === item.id ? 'Completing…' : 'Complete'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
