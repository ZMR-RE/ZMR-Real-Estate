import { useState } from 'react'
import type { PickListOption } from './pickListsQueries'

interface ManageOptionsPanelProps {
  title: string
  options: PickListOption[]
  loading: boolean
  error: string | null
  saving: boolean
  onAdd: (value: string) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onRestore: (id: string) => Promise<void>
  // Roadmap 1.30 — PickListSelect drives this panel's open state itself
  // (an inline "+ Manage [X]" entry inside its own dropdown triggers it,
  // per the universal dropdown convention, rather than an adjacent
  // toggle button). When both are omitted the panel falls back to its
  // own internal open/closed state and renders its own toggle button —
  // used by the standalone surfaces (Settings, Reconciliation Queue)
  // that have no dropdown of their own to trigger it from.
  isOpen?: boolean
  onClose?: () => void
}

// The one shared "Manage options" surface for every account-scoped
// pick-list dropdown (roadmap 8.1). Archiving never deletes a row — it
// just stops the value from appearing as a choice going forward; any
// record already saved with that value keeps displaying it (see
// PickListSelect, which renders a record's current value even when it
// no longer appears in the active list).
//
// Takes its data and actions as props rather than loading them itself —
// it shares the same usePickListOptions instance as the dropdown it's
// attached to, so adding/archiving an option here is reflected in that
// dropdown immediately instead of only after the next remount.
export function ManageOptionsPanel({
  title,
  options,
  loading,
  error,
  saving,
  onAdd,
  onArchive,
  onRestore,
  isOpen: controlledIsOpen,
  onClose,
}: ManageOptionsPanelProps) {
  const isControlled = controlledIsOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = isControlled ? controlledIsOpen : internalOpen
  const [newValue, setNewValue] = useState('')

  const handleAdd = async () => {
    if (!newValue.trim()) return
    await onAdd(newValue)
    setNewValue('')
  }

  const close = () => {
    if (isControlled) onClose?.()
    else setInternalOpen(false)
  }

  return (
    <div className="manage-options">
      {!isControlled && (
        <button type="button" className="manage-options-toggle" onClick={() => setInternalOpen((open) => !open)}>
          {isOpen ? 'Done' : `Manage ${title.toLowerCase()}`}
        </button>
      )}

      {isOpen && (
        <div className="manage-options-panel">
          {isControlled && (
            <div className="manage-options-panel-header">
              <p>Manage {title.toLowerCase()}</p>
              <button type="button" onClick={close}>
                Done
              </button>
            </div>
          )}
          {error && <p role="alert">{error}</p>}

          <div className="manage-options-add-row">
            <input
              type="text"
              placeholder={`Add a new ${title.toLowerCase().replace(/s$/, '')}`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
            />
            <button type="button" disabled={saving || !newValue.trim()} onClick={handleAdd}>
              Add
            </button>
          </div>

          {loading ? (
            <p>Loading…</p>
          ) : options.length === 0 ? (
            <p className="manage-options-empty">No options yet — add the first one above.</p>
          ) : (
            <ul className="manage-options-list">
              {options.map((option) => (
                <li key={option.id} className={option.active ? '' : 'manage-options-archived'}>
                  <span>{option.value}</span>
                  {option.active ? (
                    <button type="button" disabled={saving} onClick={() => onArchive(option.id)}>
                      Archive
                    </button>
                  ) : (
                    <button type="button" disabled={saving} onClick={() => onRestore(option.id)}>
                      Restore
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
