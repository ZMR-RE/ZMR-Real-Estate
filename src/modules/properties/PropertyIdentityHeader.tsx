import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { describeOrganizationType, type OwnershipAuthority } from '../llcs/ownershipInterestsQueries'
import type { Property } from './propertiesQueries'
import { PropertyPhoto } from './PropertyPhoto'
import { PropertyLastUpdated } from './PropertyLastUpdated'

interface PropertyIdentityHeaderProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  ownershipAuthority: OwnershipAuthority
  // Only meaningful for the 'one_incomplete'/'transitioned_to_one' cases
  // — the current single owner's own label, resolved by the caller
  // (PropertySummary) from the real ownership-interests row, never from
  // property.llc_id.
  currentOwnerLabel: string | null
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

function legacyLlcLabel(llcId: string | null, llcOptions: SearchableSelectOption[]): string | null {
  if (llcId === null) return null
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
// address.
//
// Roadmap 7.39 (3) — Contact email moved out of this header (it used to
// ride along here as a lone line) into Purchase & valuation's new
// Ownership sub-list, alongside the new Contact phone field —
// consolidated with the rest of the ownership/contact info rather than
// floating separately.
//
// Roadmap 7.34 — restructured around the full-width hero photo: address/
// city-state-zip moved onto the image itself (PropertyPhoto's own
// overlay) rather than a separate text block beside a small thumbnail.
// Organization type/Status now form one row directly below the image.
// The box's own top-right Edit (EditableSection, the Box interaction
// standard's single entry point) is unchanged — nothing here duplicates
// or relocates it, despite the row sitting visually close to where Edit
// reads on screen.
//
// Roadmap 7.39 (4) — $/sq ft removed from this row entirely (it now
// lives only on the KPI tab's Market & financial snapshot card,
// MarketFinancialSnapshotCard.tsx — no duplication between the two).
export function PropertyIdentityHeader({ property, llcOptions, ownershipAuthority, currentOwnerLabel }: PropertyIdentityHeaderProps) {
  const cityStateZip = formatCityStateZip(property)
  const legacyLabel = legacyLlcLabel(property.llc_id, llcOptions)

  return (
    <div className="property-identity-header">
      <PropertyPhoto propertyId={property.id} address={property.address} cityStateZip={cityStateZip} />
      <div className="property-identity-meta">
        <div className="field">
          {/* Package 1 §2 — never asserts confirmed ownership from
              property.llc_id alone; see describeOrganizationType and
              the six-case table it implements. */}
          <dt>Organization type</dt>
          <dd>{describeOrganizationType(ownershipAuthority, currentOwnerLabel, legacyLabel)}</dd>
        </div>
        <span className={`status-badge ${STATUS_BADGE_VARIANTS[property.status]}`}>
          {STATUS_LABELS[property.status]}
        </span>
      </div>
      {/* Roadmap 7.35 (4) */}
      <PropertyLastUpdated propertyId={property.id} />
    </div>
  )
}
