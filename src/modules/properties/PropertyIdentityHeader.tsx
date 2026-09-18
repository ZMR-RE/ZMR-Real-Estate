import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { NO_LLC_ID } from '../llcs/useLlcs'
import type { Property } from './propertiesQueries'

interface PropertyIdentityHeaderProps {
  property: Property
  llcOptions: SearchableSelectOption[]
}

const STATUS_LABELS: Record<Property['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  sold: 'Sold',
}

const STATUS_BADGE_VARIANTS: Record<Property['status'], string> = {
  active: 'status-badge-success',
  inactive: 'status-badge-neutral',
  sold: 'status-badge-accent',
}

function llcDisplay(llcId: string | null, llcOptions: SearchableSelectOption[]): string {
  if (llcId === null) {
    return llcOptions.find((o) => o.id === NO_LLC_ID)?.label ?? 'Individual ownership'
  }
  return llcOptions.find((o) => o.id === llcId)?.label ?? llcId
}

// City/State/Zip subline, omitting whichever pieces are missing rather
// than showing gaps or dashes — e.g. "IL 60018" if city is blank, "" (no
// subline at all) if all three are.
function formatCityStateZip(property: Property): string {
  const cityState = [property.city, property.state].filter(Boolean).join(', ')
  return [cityState, property.zip].filter(Boolean).join(' ')
}

// Roadmap 7.22 — the identity block pulled out of the flat field grid:
// address is the canonical identifier (see shared/propertyLabel.ts) so it
// renders large and first; the legacy free-text "name" field is dropped
// from this view entirely (still editable via the edit form, per its
// required DB column) since showing it here would just duplicate the
// address. Contact email rides along as a minor secondary line rather
// than its own field group.
export function PropertyIdentityHeader({ property, llcOptions }: PropertyIdentityHeaderProps) {
  const cityStateZip = formatCityStateZip(property)

  return (
    <div className="property-identity-header">
      <div className="property-identity-main">
        <h3 className="property-identity-address">{property.address ?? 'No address on file'}</h3>
        {cityStateZip && <p className="property-identity-subline">{cityStateZip}</p>}
        {property.contact_email && <p className="property-identity-subline">{property.contact_email}</p>}
      </div>
      <div className="property-identity-meta">
        <div className="field">
          <dt>Organization type</dt>
          <dd>{llcDisplay(property.llc_id, llcOptions)}</dd>
        </div>
        <span className={`status-badge ${STATUS_BADGE_VARIANTS[property.status]}`}>
          {STATUS_LABELS[property.status]}
        </span>
      </div>
    </div>
  )
}
