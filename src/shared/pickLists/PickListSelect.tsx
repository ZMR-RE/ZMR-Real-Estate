import { useState } from 'react'
import { usePickListOptions } from './usePickListOptions'
import { ManageOptionsPanel } from './ManageOptionsPanel'
import { resolveCurrentValueOption } from './resolveCurrentValueOption'
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
  // M1 — first-entry setup. When set and the list has no active choices,
  // the field explains what to do and offers an "Add …" button that opens
  // the same Manage panel; a value added from there is selected
  // immediately. Omitted by every other screen, which keeps today's
  // behavior unchanged.
  emptySetup?: { explanation: string; addLabel: string }
  invalid?: boolean
  describedBy?: string
}

// A dropdown backed by an account-scoped pick list, with its "Manage
// options" panel attached. Both share the one usePickListOptions
// instance below, so adding or archiving a value in the panel updates
// this dropdown's choices immediately. If the field's current value was
// archived after this record was saved, it still renders as the
// selected option (labeled "archived") so an existing record never
// appears to silently lose or change its value — it just can't be
// chosen again for new rows.
export function PickListSelect({
  id,
  listName,
  title,
  value,
  onChange,
  required,
  placeholder,
  emptySetup,
  invalid,
  describedBy,
}: PickListSelectProps) {
  const { options, activeOptions, loading, error, saving, add, archive, restore } = usePickListOptions(listName)
  const [manageOpen, setManageOpen] = useState(false)

  const currentValueOption = resolveCurrentValueOption(value, activeOptions, loading)
  const needsSetup = emptySetup !== undefined && !loading && activeOptions.length === 0 && value === ''

  // Selecting what was just created only applies to the setup flow;
  // cancelling ("Done" without adding) or a failed add selects nothing
  // and leaves the surrounding form untouched.
  const handleAdd = async (newValue: string) => {
    const saved = await add(newValue)
    if (saved && emptySetup) {
      onChange(newValue.trim())
      setManageOpen(false)
    }
    return saved
  }

  return (
    <div className="pick-list-select">
      <select
        id={id}
        value={value}
        required={required}
        disabled={loading}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          if (e.target.value === MANAGE_OPTION_VALUE) {
            setManageOpen(true)
            return
          }
          onChange(e.target.value)
        }}
      >
        <option value="">{placeholder ?? 'Select…'}</option>
        {currentValueOption && <option value={currentValueOption.value}>{currentValueOption.label}</option>}
        {activeOptions.map((option) => (
          <option key={option.id} value={option.value}>
            {option.value}
          </option>
        ))}
        <option value={MANAGE_OPTION_VALUE}>{`+ Manage ${title.toLowerCase()}`}</option>
      </select>
      {needsSetup && !manageOpen && (
        <div className="pick-list-setup">
          <p className="field-hint">{emptySetup.explanation}</p>
          <button type="button" onClick={() => setManageOpen(true)}>
            {emptySetup.addLabel}
          </button>
        </div>
      )}
      <ManageOptionsPanel
        title={title}
        options={options}
        loading={loading}
        error={error}
        saving={saving}
        onAdd={handleAdd}
        onArchive={archive}
        onRestore={restore}
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
      />
    </div>
  )
}
