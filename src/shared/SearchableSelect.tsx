import { useState } from 'react'

export interface SearchableSelectOption {
  id: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string | null
  onChange: (id: string) => void
  placeholder?: string
  onAddNew?: () => void
  addNewLabel?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  onAddNew,
  addNewLabel = '+ Add new',
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
        }}
        onBlur={() => setIsOpen(false)}
      />
      {isOpen && (
        <ul className="searchable-select-menu">
          {filtered.length === 0 && <li className="searchable-select-empty">No matches</li>}
          {filtered.map((option) => (
            <li key={option.id}>
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
        </ul>
      )}
    </div>
  )
}
