import { Link } from 'react-router-dom'
import type { Property } from './propertiesQueries'

interface PropertyListProps {
  properties: Property[]
  onAddNew: () => void
}

export function PropertyList({ properties, onAddNew }: PropertyListProps) {
  return (
    <div>
      <button type="button" onClick={onAddNew}>
        Add property
      </button>
      <ul>
        {properties.map((property) => (
          <li key={property.id}>
            <Link to={`/properties/${property.id}`}>
              {property.name}
              {property.address ? ` — ${property.address}` : ''}
              {property.city ? `, ${property.city}` : ''}
              {property.status === 'inactive' ? ' (inactive)' : ''}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
