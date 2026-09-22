import type { ReactNode } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { formatDateOnly } from '../../shared/dateFormat'
import type { Property } from './propertiesQueries'
import { PROPERTY_FIELD_GROUPS, hasFieldValue } from './propertyFieldGroups'
import { PropertyFieldGroup } from './PropertyFieldGroup'
import { PropertyIdentityHeader } from './PropertyIdentityHeader'

interface PropertySummaryProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  marketValue: number | null
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const LOT_SIZE_UNIT_LABELS: Record<'acres' | 'sqft', string> = {
  acres: 'acres',
  sqft: 'sq ft',
}

// Field-specific display formatting. Every other field in
// PROPERTY_FIELD_GROUPS is a plain string column, shown as-is.
function renderFieldValue(property: Property, key: keyof Property): ReactNode {
  switch (key) {
    case 'purchase_price':
      return currencyFormatter.format(Number(property.purchase_price))
    case 'purchase_date':
      return formatDateOnly(property.purchase_date!)
    case 'square_footage':
      return `${Number(property.square_footage).toLocaleString()} sq ft`
    case 'lot_size':
      // Roadmap 7.32 (1) — structured value takes priority; the legacy
      // free-text column (kept, never guessed at) is only a fallback
      // for a value entered before this toggle existed.
      return property.lot_size_value !== null
        ? `${Number(property.lot_size_value).toLocaleString()} ${LOT_SIZE_UNIT_LABELS[property.lot_size_unit ?? 'sqft']}`
        : property.lot_size
    case 'year_built':
      return property.year_built
    default:
      return property[key] as string
  }
}

// Roadmap 7.22 — Overview tab declutter. Identity fields (address,
// city/state/zip, contact email, organization type, status) pulled into
// a dedicated header; every remaining field lives inside one of
// PROPERTY_FIELD_GROUPS's labeled sub-sections, where fields without a
// real value collapse into a single "+ Add …" prompt instead of each
// showing "—". Insurance used to be one of these groups (with its own
// documents special case) before it became its own historical ledger
// (InsuranceLedger.tsx) — removed from here entirely, not just emptied.
export function PropertySummary({ property, llcOptions, marketValue }: PropertySummaryProps) {
  return (
    <div className="property-summary">
      <PropertyIdentityHeader property={property} llcOptions={llcOptions} marketValue={marketValue} />

      {PROPERTY_FIELD_GROUPS.map((group) => {
        const presentFields = group.fields
          .filter((field) => hasFieldValue(property, field.key))
          .map((field) => ({ label: field.label, value: renderFieldValue(property, field.key) }))
        const missingFields = group.fields
          .filter((field) => !hasFieldValue(property, field.key))
          .map((field) => ({ key: field.key, label: field.label }))

        return (
          <PropertyFieldGroup
            key={group.id}
            title={group.title}
            presentFields={presentFields}
            missingFields={missingFields}
          />
        )
      })}
    </div>
  )
}
