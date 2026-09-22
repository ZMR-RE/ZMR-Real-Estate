import { useState } from 'react'
import { usePickListOptions } from './usePickListOptions'
import { ManageOptionsPanel } from './ManageOptionsPanel'
import type { PickListName } from './pickListsQueries'

interface PickListCheckboxGroupProps {
  listName: PickListName
  title: string
  value: string[]
  onChange: (value: string[]) => void
}

// Roadmap 7.33 (4) — the multi-select counterpart to PickListSelect,
// same account-editable pick list underneath (still add/archive via the
// same ManageOptionsPanel), just rendered as a checkbox per active
// option instead of a single dropdown, since a property can have more
// than one exterior wall material at once (e.g. Brick + Frame). A
// value's own current-selection state survives it being archived after
// the fact, same as PickListSelect's "archived" fallback — an archived
// value that's still checked on this record renders as a disabled,
// checked, "(archived)"-labeled checkbox rather than silently
// disappearing from what the record shows.
export function PickListCheckboxGroup({ listName, title, value, onChange }: PickListCheckboxGroupProps) {
  const { options, activeOptions, loading, error, saving, add, archive, restore } = usePickListOptions(listName)
  const [manageOpen, setManageOpen] = useState(false)

  const archivedSelected = options.filter((o) => !o.active && value.includes(o.value))

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  return (
    <div className="pick-list-checkbox-group">
      <div className="pick-list-checkbox-options">
        {activeOptions.map((option) => (
          <label key={option.id} className="pick-list-checkbox-option">
            <input
              type="checkbox"
              disabled={loading}
              checked={value.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            {option.value}
          </label>
        ))}
        {archivedSelected.map((option) => (
          <label key={option.id} className="pick-list-checkbox-option">
            <input type="checkbox" checked disabled />
            {option.value} (archived)
          </label>
        ))}
      </div>
      <button type="button" onClick={() => setManageOpen(true)}>
        {`+ Manage ${title.toLowerCase()}`}
      </button>
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
