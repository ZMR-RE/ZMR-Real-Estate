import { Link } from 'react-router-dom'
import { propertyLabel } from '../../shared/propertyLabel'
import type { Property } from './propertiesQueries'

interface PropertyListProps {
  properties: Property[]
  onAddNew: () => void
}

// Roadmap 8.6 — address leads (the canonical identifier); the free-text
// name only shows alongside it when the two actually differ, so a
// property whose name is just a copy of its address (the common case
// today) doesn't show the same string twice.
export function PropertyList({ properties, onAddNew }: PropertyListProps) {
  return (
    <div>
      <button type="button" onClick={onAddNew}>
        Add property
      </button>
      <ul>
        {properties.map((property) => {
          const label = propertyLabel(property)
          return (
            <li key={property.id}>
              <Link to={`/properties/${property.id}`}>
                {label}
                {property.name !== label ? ` (${property.name})` : ''}
                {property.city ? `, ${property.city}` : ''}
                {property.status === 'inactive' ? ' (inactive)' : ''}
                {property.status === 'sold' ? ' (sold)' : ''}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
