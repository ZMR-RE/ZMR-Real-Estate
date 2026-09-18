import type { Property } from './propertiesQueries'

export interface PropertyFieldMeta {
  key: keyof Property
  label: string
}

export interface PropertyFieldGroupDef {
  id: string
  title: string
  fields: PropertyFieldMeta[]
}

// Roadmap 7.22 — Overview tab declutter. Every field other than the
// identity-header ones (address, city/state/zip, contact email,
// organization type, status) lives in one of these three groups. Order
// within "Physical facts" follows the task's own listed order.
export const PROPERTY_FIELD_GROUPS: PropertyFieldGroupDef[] = [
  {
    id: 'insurance',
    title: 'Insurance',
    fields: [
      { key: 'insurance_provider', label: 'Insurance provider' },
      { key: 'insurance_policy_number', label: 'Insurance policy number' },
    ],
  },
  {
    id: 'purchase-valuation',
    title: 'Purchase & valuation',
    fields: [
      { key: 'purchase_price', label: 'Purchase price' },
      { key: 'purchase_date', label: 'Purchase date' },
    ],
  },
  {
    id: 'physical-facts',
    title: 'Physical facts',
    fields: [
      { key: 'square_footage', label: 'Square footage' },
      { key: 'lot_size', label: 'Lot size' },
      { key: 'bedroom_count', label: 'Bedrooms (whole building)' },
      { key: 'bathroom_count', label: 'Bathrooms (whole building)' },
      { key: 'basement', label: 'Basement' },
      { key: 'garage_parking_spaces', label: 'Garage/parking spaces' },
      { key: 'property_tax_id', label: 'Property tax ID/PIN' },
      { key: 'zoning_use_code', label: 'Zoning/use code' },
      { key: 'county_township', label: 'County/Township' },
      { key: 'purchase_method', label: 'Purchase method' },
      { key: 'property_type', label: 'Property type' },
    ],
  },
]

// Every field in these groups is a `string | null` column (numeric
// columns come back from PostgREST as strings too, per propertiesQueries.ts),
// so a single null/empty-string check covers all of them uniformly.
export function hasFieldValue(property: Property, key: keyof Property): boolean {
  const value = property[key]
  return value !== null && value !== ''
}
