import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { NO_LLC_ID } from '../llcs/useLlcs'
import type { DocumentRecord } from '../documents/documentsQueries'
import type { Property } from './propertiesQueries'

interface PropertySummaryProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  insuranceDocuments: DocumentRecord[]
  onViewDocument: (path: string) => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

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

// A plain date column (no time component) parsed with `new Date()` gets
// read as UTC midnight, which `toLocaleDateString()` can then roll back
// a day in any timezone behind UTC — so this reformats the "YYYY-MM-DD"
// string directly instead, same as capture_log.entry_date does elsewhere.
function formatDateOnly(value: string): string {
  const [year, month, day] = value.split('-')
  return `${Number(month)}/${Number(day)}/${year}`
}

function llcDisplay(llcId: string | null, llcOptions: SearchableSelectOption[]): string {
  if (llcId === null) {
    return llcOptions.find((o) => o.id === NO_LLC_ID)?.label ?? 'Individual ownership'
  }
  return llcOptions.find((o) => o.id === llcId)?.label ?? llcId
}

// Roadmap 7.7 — Overview tab's core property-fields section, view-by-
// default with an explicit Edit action (moved to the screen header by
// 7.16 — this component no longer renders its own Edit button). Roadmap
// 7.10 asks for an "insurance section with coverage dates + attached
// document" — coverage dates aren't a field that exists anywhere in this
// app yet (flagged, not guessed at), but the attached-document half is
// real: documents already support an "Insurance" category (2.5), so any
// doc tagged that way for this property lists here.
export function PropertySummary({ property, llcOptions, insuranceDocuments, onViewDocument }: PropertySummaryProps) {
  return (
    <div className="property-summary">
      <dl className="field-grid">
        <div className="field">
          <dt>Name</dt>
          <dd>{property.name}</dd>
        </div>
        <div className="field">
          <dt>Organization type</dt>
          <dd>{llcDisplay(property.llc_id, llcOptions)}</dd>
        </div>
        <div className="field">
          <dt>Address</dt>
          <dd>{property.address ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>City</dt>
          <dd>{property.city ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>State</dt>
          <dd>{property.state ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Zip</dt>
          <dd>{property.zip ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Insurance provider</dt>
          <dd>{property.insurance_provider ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Insurance policy number</dt>
          <dd>{property.insurance_policy_number ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Insurance documents</dt>
          <dd>
            {insuranceDocuments.length === 0 ? (
              '—'
            ) : (
              <ul>
                {insuranceDocuments.map((doc) => (
                  <li key={doc.id}>
                    {doc.link_url ? (
                      <a href={doc.link_url} target="_blank" rel="noopener noreferrer">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </a>
                    ) : (
                      <button type="button" onClick={() => onViewDocument(doc.storage_path!)}>
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div className="field">
          <dt>Contact email</dt>
          <dd>{property.contact_email ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Purchase price</dt>
          <dd>
            {property.purchase_price !== null ? currencyFormatter.format(Number(property.purchase_price)) : '—'}
          </dd>
        </div>
        <div className="field">
          <dt>Property type</dt>
          <dd>{property.property_type ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Purchase date</dt>
          <dd>{property.purchase_date ? formatDateOnly(property.purchase_date) : '—'}</dd>
        </div>
        <div className="field">
          <dt>Purchase method</dt>
          <dd>{property.purchase_method ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Property tax ID/PIN</dt>
          <dd>{property.property_tax_id ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>County/Township</dt>
          <dd>{property.county_township ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Square footage</dt>
          <dd>
            {property.square_footage !== null ? `${Number(property.square_footage).toLocaleString()} sqft` : '—'}
          </dd>
        </div>
        <div className="field">
          <dt>Lot size</dt>
          <dd>{property.lot_size ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Zoning/use code</dt>
          <dd>{property.zoning_use_code ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Bedrooms (whole building)</dt>
          <dd>{property.bedroom_count ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Bathrooms (whole building)</dt>
          <dd>{property.bathroom_count ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Basement</dt>
          <dd>{property.basement ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Garage/parking spaces</dt>
          <dd>{property.garage_parking_spaces ?? '—'}</dd>
        </div>
        <div className="field">
          <dt>Status</dt>
          <dd>
            <span className={`status-badge ${STATUS_BADGE_VARIANTS[property.status]}`}>
              {STATUS_LABELS[property.status]}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  )
}
