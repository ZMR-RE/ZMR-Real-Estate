import { useState } from 'react'

export interface SearchableSelectOption {
  id: string
  label: string
  // Roadmap 1.28 — optional grouping (e.g. "Vendors" / "Tenants" in
  // Visit's "Who was met with" picker). Options are expected to already
  // be ordered so same-group items sit together; a group header renders
  // once, right before the first option of each new group encountered.
  group?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string | null
  onChange: (id: string) => void
  placeholder?: string
  onAddNew?: () => void
  addNewLabel?: string
  // Roadmap 1.28 revision — a second, differently-labeled inline
  // creation action, for pickers offering more than one kind of "add
  // new" (Visit's "who was met with": + Add new vendor / + Add
  // potential tenant). Rendered as an additional footer entry alongside
  // onAddNew, never replacing it.
  onAddNewSecondary?: () => void
  addNewSecondaryLabel?: string
  // Roadmap 1.16 fix — options are whatever the caller last fetched, which
  // for a property-scoped list (e.g. financial accounts) can go stale the
  // moment something is added elsewhere while this picker's screen stays
  // mounted (no propertyId change to re-trigger the caller's own fetch
  // effect). Optional: called every time the menu opens, so a caller with
  // a live-changing options source can refresh right before the user sees
  // it — no reload or reselection required.
  onOpen?: () => void
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  onAddNew,
  addNewLabel = '+ Add new',
  onAddNewSecondary,
  addNewSecondaryLabel = '+ Add new',
  onOpen,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selected = options.find((o) => o.id === value) ?? null
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="searchable-select">
      <input
        type="text"
        placeholder={placeholder}
        value={isOpen ? query : (selected?.label ?? '')}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setQuery('')
          setIsOpen(true)
          onOpen?.()
        }}
        onBlur={() => setIsOpen(false)}
      />
      {isOpen && (
        <ul className="searchable-select-menu">
          {filtered.length === 0 && <li className="searchable-select-empty">No matches</li>}
          {filtered.map((option, index) => (
            <li key={option.id}>
              {option.group && option.group !== filtered[index - 1]?.group && (
                <p className="searchable-select-group-label">{option.group}</p>
              )}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(option.id)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
          {onAddNew && (
            <li className="searchable-select-add-new">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onAddNew()
                  setIsOpen(false)
                }}
              >
                {addNewLabel}
              </button>
            </li>
          )}
          {onAddNewSecondary && (
            <li className="searchable-select-add-new">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onAddNewSecondary()
                  setIsOpen(false)
                }}
              >
                {addNewSecondaryLabel}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
