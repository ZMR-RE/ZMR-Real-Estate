import { Link } from 'react-router-dom'
import { propertyLabel } from '../../shared/propertyLabel'
import type { Property } from './propertiesQueries'

interface PropertyListProps {
  properties: Property[]
  onAddNew: () => void
}

const STATUS_BADGE: Partial<Record<Property['status'], { label: string; variant: string }>> = {
  inactive: { label: 'Inactive', variant: 'status-badge-neutral' },
  sold: { label: 'Sold', variant: 'status-badge-accent' },
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
      <ul className="card-list">
        {properties.map((property) => {
          const label = propertyLabel(property)
          const badge = STATUS_BADGE[property.status]
          return (
            <li key={property.id} className="card">
              <Link to={`/properties/${property.id}`} className="card-list-link">
                <span>
                  {label}
                  {property.name !== label ? ` (${property.name})` : ''}
                  {property.city ? `, ${property.city}` : ''}
                </span>
                {badge && <span className={`status-badge ${badge.variant}`}>{badge.label}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
