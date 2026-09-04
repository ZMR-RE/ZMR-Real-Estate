import type { Property } from './propertiesQueries'

interface PropertyListProps {
  properties: Property[]
  onSelect: (id: string) => void
  onAddNew: () => void
}

export function PropertyList({ properties, onSelect, onAddNew }: PropertyListProps) {
  return (
    <div>
      <button type="button" onClick={onAddNew}>
        Add property
      </button>
      <ul>
        {properties.map((property) => (
          <li key={property.id}>
            <button type="button" onClick={() => onSelect(property.id)}>
              {property.name}
              {property.address ? ` — ${property.address}` : ''}
              {property.city ? `, ${property.city}` : ''}
              {property.status === 'inactive' ? ' (inactive)' : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
