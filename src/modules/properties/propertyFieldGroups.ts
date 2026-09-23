import type { ComponentType } from 'react'
import type { Property } from './propertiesQueries'
import { ExteriorInformationIcon, PhysicalFactsIcon, PurchaseValuationIcon } from './propertyFieldGroupIcons'

export interface PropertyFieldMeta {
  key: keyof Property
  label: string
}

export interface PropertyFieldGroupDef {
  id: string
  title: string
  // Roadmap 7.35 (5) — a component reference rather than a rendered
  // icon, so this file can stay plain .ts (JSX needs .tsx); consumers
  // render it as <group.Icon />.
  Icon: ComponentType
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
//
// Roadmap 7.33 (3) — the Heating & cooling group (ac_type/heating_type,
// 7.32) is removed: HVAC is now an Area option inside the existing
// Specs & measurements section instead (reuses that section's
// per-unit/whole-building Scope architecture rather than being a
// property-flat pair of fields). ac_type/heating_type columns and their
// pick lists are kept, unused, never dropped — no property had a value
// set (confirmed live before this removal).
export const PROPERTY_FIELD_GROUPS: PropertyFieldGroupDef[] = [
  {
    id: 'purchase-valuation',
    title: 'Purchase & valuation',
    Icon: PurchaseValuationIcon,
    fields: [
      { key: 'purchase_price', label: 'Purchase price' },
      { key: 'purchase_date', label: 'Purchase date' },
    ],
  },
  {
    id: 'physical-facts',
    title: 'Physical facts',
    Icon: PhysicalFactsIcon,
    // Roadmap 7.38 (1) — Bedrooms/Bathrooms/Living area/Year built
    // pulled out into headline stat cards (PropertyPhysicalFactsStats,
    // rendered by PropertySummary above this group's own field-grid,
    // which now renders as a quieter "Details" sub-list) — no longer
    // listed here.
    fields: [
      { key: 'lot_size', label: 'Lot size' },
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
  // Roadmap 7.32 (5) / 7.33 (4) — exterior_wall_material converted from
  // single-select to a multi-select checklist; the field key now points
  // at the array column.
  {
    id: 'exterior-information',
    title: 'Exterior information',
    Icon: ExteriorInformationIcon,
    fields: [{ key: 'exterior_wall_materials', label: 'Exterior wall material' }],
  },
]

// Every field in these groups is a `string | null` column (numeric
// columns come back from PostgREST as strings too, per propertiesQueries.ts),
// so a single null/empty-string check covers all of them uniformly —
// except 'lot_size' (roadmap 7.32), a synthetic key covering two real
// columns (lot_size_value/lot_size_unit) plus a legacy free-text
// fallback (lot_size itself, see propertiesQueries.ts's Property.lot_size
// comment) — present if either the structured value or the legacy text
// has something — and 'exterior_wall_materials' (roadmap 7.33), an
// array column, present if it has at least one selected value.
export function hasFieldValue(property: Property, key: keyof Property): boolean {
  if (key === 'lot_size') {
    return property.lot_size_value !== null || (property.lot_size !== null && property.lot_size !== '')
  }
  if (key === 'exterior_wall_materials') {
    return property.exterior_wall_materials.length > 0
  }
  const value = property[key]
  return value !== null && value !== ''
}
