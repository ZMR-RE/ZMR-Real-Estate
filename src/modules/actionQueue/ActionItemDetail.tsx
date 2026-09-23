import { useState } from 'react'
import { propertyLabel } from '../../shared/propertyLabel'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { ActionItemForm } from './ActionItemForm'
import { ActionItemDocuments } from './ActionItemDocuments'
import { ActionItemVendorEstimates } from '../vendorEstimates/ActionItemVendorEstimates'
import type { ActionItem, ActionItemInput } from './actionItemsQueries'

interface ActionItemDetailProps {
  item: ActionItem
  propertyOptions: SearchableSelectOption[]
  memberOptions: SearchableSelectOption[]
  saving: boolean
  onSaveEdit: (input: ActionItemInput) => void
  onClose: () => void
}

const RECURRENCE_LABELS: Record<string, string> = {
  none: 'Does not repeat',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
}

function recurrenceLabel(item: ActionItem): string {
  if (item.recurrence === 'custom') {
    return `Every ${item.custom_interval_days ?? '?'} day${item.custom_interval_days === 1 ? '' : 's'}`
  }
  return RECURRENCE_LABELS[item.recurrence] ?? item.recurrence
}

// Roadmap 10.5 — full detail for one action item: view-only by default
// (Box interaction standard), an explicit Edit action reveals the same
// ActionItemForm used to create one. Links & attachments sits below,
// available in both view and edit state since it manages its own
// records independently of the item's own fields.
export function ActionItemDetail({
  item,
  propertyOptions,
  memberOptions,
  saving,
  onSaveEdit,
  onClose,
}: ActionItemDetailProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = (input: ActionItemInput) => {
    onSaveEdit(input)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="action-item-detail">
        <ActionItemForm
          initialValues={{
            propertyId: item.property_id,
            unitId: item.unit_id,
            type: item.type,
            title: item.title,
            notes: item.notes,
            assignee: item.assignee,
            dueDate: item.due_date,
            recurrence: item.recurrence,
            customIntervalDays: item.custom_interval_days,
          }}
          propertyOptions={propertyOptions}
          memberOptions={memberOptions}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
        <ActionItemDocuments actionItemId={item.id} propertyId={item.property_id} />
      </div>
    )
  }

  const assignee = item.assignee ? (memberOptions.find((m) => m.id === item.assignee)?.label ?? item.assignee) : 'Unassigned'

  return (
    <div className="action-item-detail">
      <div className="page-header-row">
        <h4>{item.title}</h4>
        <div>
          <button type="button" onClick={() => setIsEditing(true)}>
            Edit
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <dl className="action-item-detail-fields">
        <dt>Description</dt>
        <dd>{item.notes || '—'}</dd>

        <dt>Due date</dt>
        <dd>{item.due_date}</dd>

        <dt>Property / unit</dt>
        <dd>
          {item.property ? propertyLabel(item.property) : 'Account-level'}
          {item.unit && ` — ${item.unit.unit_label}`}
        </dd>

        <dt>Type</dt>
        <dd>{item.type ?? '—'}</dd>

        <dt>Assignee</dt>
        <dd>{assignee}</dd>

        <dt>Repeats</dt>
        <dd>{recurrenceLabel(item)}</dd>

        {item.source_label && (
          <>
            <dt>Linked source</dt>
            <dd>{item.source_label}</dd>
          </>
        )}
      </dl>

      <ActionItemDocuments actionItemId={item.id} propertyId={item.property_id} />
      <ActionItemVendorEstimates actionItemId={item.id} />
    </div>
  )
}
