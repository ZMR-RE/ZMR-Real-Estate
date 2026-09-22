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
// organization type, status) lives in one of these groups. Order
// within "Physical facts" follows the task's own listed order.
//
// The Insurance group that used to live here (insurance_provider/
// insurance_policy_number) was removed when Insurance became its own
// historical ledger (new build item, InsuranceLedger.tsx) — those two
// columns are kept on the properties table, unused, never dropped, per
// CLAUDE.md's no-drop-without-approval rule; their real existing values
// were carried forward as each property's first ledger entry
// (20260922020000_property_insurance_policies.sql).
export const PROPERTY_FIELD_GROUPS: PropertyFieldGroupDef[] = [
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
      { key: 'garage_spaces', label: 'Garage spaces' },
      { key: 'street_parking', label: 'Street parking' },
      { key: 'parking_notes', label: 'Parking notes' },
      { key: 'property_tax_id', label: 'Property tax ID/PIN' },
      { key: 'municipal_zoning_code', label: 'Municipal zoning code' },
      { key: 'county_assessor_use_code', label: 'County assessor use code' },
      { key: 'county', label: 'County' },
      { key: 'township', label: 'Township' },
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
