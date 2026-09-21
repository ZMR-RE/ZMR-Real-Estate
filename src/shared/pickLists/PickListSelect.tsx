import { useState } from 'react'
import { usePickListOptions } from './usePickListOptions'
import { ManageOptionsPanel } from './ManageOptionsPanel'
import type { PickListName } from './pickListsQueries'

// Roadmap 1.30 — sentinel option value for the inline "+ Manage [X]"
// entry every pick-list dropdown now ends with (the universal dropdown
// convention). Never a real pick-list value — usePickListOptions' add()
// operates on user-entered text, so this constant would only collide if
// a user typed this exact string as an option, an acceptable edge case
// given the alternative (a wrapper object/discriminated value for every
// dropdown) is disproportionate for what it prevents.
const MANAGE_OPTION_VALUE = '__manage__'

interface PickListSelectProps {
  id: string
  listName: PickListName
  title: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}

// A dropdown backed by an account-scoped pick list, with its "Manage
// options" panel attached. Both share the one usePickListOptions
// instance below, so adding or archiving a value in the panel updates
// this dropdown's choices immediately. If the field's current value was
// archived after this record was saved, it still renders as the
// selected option (labeled "archived") so an existing record never
// appears to silently lose or change its value — it just can't be
// chosen again for new rows.
export function PickListSelect({ id, listName, title, value, onChange, required, placeholder }: PickListSelectProps) {
  const { options, activeOptions, loading, error, saving, add, archive, restore } = usePickListOptions(listName)
  const [manageOpen, setManageOpen] = useState(false)

  const showArchivedCurrentValue = value !== '' && !activeOptions.some((o) => o.value === value)

  return (
    <div className="pick-list-select">
      <select
        id={id}
        value={value}
        required={required}
        disabled={loading}
        onChange={(e) => {
          if (e.target.value === MANAGE_OPTION_VALUE) {
            setManageOpen(true)
            return
          }
          onChange(e.target.value)
        }}
      >
        <option value="">{placeholder ?? 'Select…'}</option>
        {showArchivedCurrentValue && (
          <option value={value}>{value} (archived)</option>
        )}
        {activeOptions.map((option) => (
          <option key={option.id} value={option.value}>
            {option.value}
          </option>
        ))}
        <option value={MANAGE_OPTION_VALUE}>{`+ Manage ${title.toLowerCase()}`}</option>
      </select>
      <ManageOptionsPanel
        title={title}
        options={options}
        loading={loading}
        error={error}
        saving={saving}
        onAdd={add}
        onArchive={archive}
        onRestore={restore}
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
      />
    </div>
  )
}
