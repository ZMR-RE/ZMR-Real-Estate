import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { NO_LLC_ID } from '../llcs/useLlcs'
import type { Property } from './propertiesQueries'
import { PropertyPhoto } from './PropertyPhoto'
import { PropertyPricePerSqft } from './PropertyPricePerSqft'
import { PropertyLastUpdated } from './PropertyLastUpdated'

interface PropertyIdentityHeaderProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  marketValue: number | null
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
//
// Roadmap 7.34 — restructured around the full-width hero photo: address/
// city-state-zip moved onto the image itself (PropertyPhoto's own
// overlay) rather than a separate text block beside a small thumbnail.
// Organization type/$/sq ft/Status now form one row directly below the
// image. The box's own top-right Edit (EditableSection, the Box
// interaction standard's single entry point) is unchanged — nothing
// here duplicates or relocates it, despite the row sitting visually
// close to where Edit reads on screen.
export function PropertyIdentityHeader({ property, llcOptions, marketValue }: PropertyIdentityHeaderProps) {
  const cityStateZip = formatCityStateZip(property)

  return (
    <div className="property-identity-header">
      <PropertyPhoto propertyId={property.id} address={property.address} cityStateZip={cityStateZip} />
      {property.contact_email && <p className="property-identity-subline">{property.contact_email}</p>}
      <div className="property-identity-meta">
        <div className="field">
          <dt>Organization type</dt>
          <dd>{llcDisplay(property.llc_id, llcOptions)}</dd>
        </div>
        {/* Roadmap 7.32 (7) */}
        <PropertyPricePerSqft property={property} marketValue={marketValue} />
        <span className={`status-badge ${STATUS_BADGE_VARIANTS[property.status]}`}>
          {STATUS_LABELS[property.status]}
        </span>
      </div>
      {/* Roadmap 7.35 (4) */}
      <PropertyLastUpdated propertyId={property.id} />
    </div>
  )
}
