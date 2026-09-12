import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { NO_LLC_ID } from '../llcs/useLlcs'
import type { Property } from './propertiesQueries'

interface PropertySummaryProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  onEdit: () => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function llcDisplay(llcId: string | null, llcOptions: SearchableSelectOption[]): string {
  if (llcId === null) {
    return llcOptions.find((o) => o.id === NO_LLC_ID)?.label ?? 'No LLC'
  }
  return llcOptions.find((o) => o.id === llcId)?.label ?? llcId
}

// Roadmap 7.7 — Overview tab's core property-fields section, view-by-
// default with an explicit Edit action, same pattern as
// MortgagePropertySummary on the Mortgage tab.
export function PropertySummary({ property, llcOptions, onEdit }: PropertySummaryProps) {
  return (
    <div className="property-summary">
      <dl>
        <dt>Name</dt>
        <dd>{property.name}</dd>
        <dt>LLC</dt>
        <dd>{llcDisplay(property.llc_id, llcOptions)}</dd>
        <dt>Address</dt>
        <dd>{property.address ?? '—'}</dd>
        <dt>City</dt>
        <dd>{property.city ?? '—'}</dd>
        <dt>State</dt>
        <dd>{property.state ?? '—'}</dd>
        <dt>Zip</dt>
        <dd>{property.zip ?? '—'}</dd>
        <dt>Insurance provider</dt>
        <dd>{property.insurance_provider ?? '—'}</dd>
        <dt>Insurance policy number</dt>
        <dd>{property.insurance_policy_number ?? '—'}</dd>
        <dt>Contact email</dt>
        <dd>{property.contact_email ?? '—'}</dd>
        <dt>Market value</dt>
        <dd>{property.market_value !== null ? currencyFormatter.format(Number(property.market_value)) : '—'}</dd>
        <dt>Purchase price</dt>
        <dd>{property.purchase_price !== null ? currencyFormatter.format(Number(property.purchase_price)) : '—'}</dd>
        <dt>Status</dt>
        <dd>{property.status === 'active' ? 'Active' : 'Inactive'}</dd>
      </dl>

      <button type="button" onClick={onEdit}>
        Edit property
      </button>
    </div>
  )
}
