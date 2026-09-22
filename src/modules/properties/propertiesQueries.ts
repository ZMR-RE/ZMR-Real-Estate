import { supabase } from '../../shared/supabaseClient'

export interface Property {
  id: string
  account_id: string
  name: string
  llc_id: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  insurance_provider: string | null
  insurance_policy_number: string | null
  contact_email: string | null
  purchase_price: string | null
  status: 'active' | 'inactive' | 'sold'
  // Roadmap 7.20 — Property Facts. purchase_date predates this item
  // (roadmap 2.4) but never had a UI until now.
  purchase_date: string | null
  property_type: string | null
  purchase_method: string | null
  property_tax_id: string | null
  county: string | null
  township: string | null
  square_footage: string | null
  lot_size: string | null
  // Roadmap 7.31 — zoning_use_code split into two real fields. The old
  // column (and its pick list's rows) stay in the DB, unused, never
  // dropped, per CLAUDE.md's no-drop-without-approval rule; no property
  // had a value set, confirmed live before the split, so there's
  // nothing to carry forward.
  municipal_zoning_code: string | null
  county_assessor_use_code: string | null
  // Roadmap 7.21 — whole-building totals (distinct from 7.11's per-unit
  // bed/bath count). Numeric columns come back from Postgres as strings
  // via PostgREST, same as purchase_price/square_footage above — cast
  // with Number() at display/comparison time, never stored as `number`
  // here.
  bedroom_count: string | null
  bathroom_count: string | null
  // Roadmap 7.31 — Basement's value is now constrained to a pick list
  // (Finished/Unfinished/Partially finished/None) at the UI layer; the
  // column itself is unchanged (already plain text, same as
  // property_type/purchase_method).
  basement: string | null
  // Roadmap 7.31 — garage_parking_spaces split into three fields. Same
  // keep-the-old-column treatment as zoning_use_code above; also
  // confirmed empty before the split.
  garage_spaces: string | null
  street_parking: string | null
  parking_notes: string | null
  // Roadmap 7.32 — Lot size gains a real unit toggle. Legacy free-text
  // `lot_size` above is kept as a display fallback only (see the
  // 20260922110000 migration comment for why it isn't carried forward
  // into these); square_footage (labeled "Living area (sq ft)" in the
  // UI now, column name unchanged) is the ÷ input for the $/sq ft stat.
  lot_size_value: string | null
  lot_size_unit: 'acres' | 'sqft' | null
  year_built: string | null
  // Roadmap 7.33 (3) — ac_type/heating_type columns still exist
  // (unused, never dropped — HVAC moved to Specs & measurements'
  // Area field instead) but are deliberately NOT in this interface or
  // PROPERTY_COLUMNS below, same treatment as the original
  // zoning_use_code/garage_parking_spaces columns: fully superseded,
  // never read anywhere, so there's no reason to keep selecting them.
  //
  // Roadmap 7.33 (4) — exterior_wall_material (singular) is the same
  // kind of fully-superseded column, replaced by the array below; also
  // dropped from this interface/select rather than kept as a fallback,
  // since (unlike lot_size) no property ever had a value in it.
  exterior_wall_materials: string[]
}

export type PropertyInput = Omit<Property, 'id' | 'account_id'>

const PROPERTY_COLUMNS =
  'id, account_id, name, llc_id, address, city, state, zip, insurance_provider, insurance_policy_number, contact_email, purchase_price, status, purchase_date, property_type, purchase_method, property_tax_id, county, township, square_footage, lot_size, municipal_zoning_code, county_assessor_use_code, bedroom_count, bathroom_count, basement, garage_spaces, street_parking, parking_notes, lot_size_value, lot_size_unit, year_built, exterior_wall_materials'

export async function listProperties(accountId: string) {
  return supabase.from('properties').select(PROPERTY_COLUMNS).eq('account_id', accountId).order('address')
}

export async function createProperty(accountId: string, input: PropertyInput) {
  return supabase
    .from('properties')
    .insert({ ...input, account_id: accountId })
    .select()
    .single()
}

// Returns the updated row directly (not just success/failure) so callers
// can reflect a save immediately from this response alone, without
// depending on a separate re-fetch that might touch unrelated data.
export async function updateProperty(id: string, input: PropertyInput) {
  return supabase.from('properties').update(input).eq('id', id).select(PROPERTY_COLUMNS).returns<Property[]>().single()
}

export interface PropertyForOrganizationType {
  id: string
  name: string
  address: string | null
}

// Roadmap 8.2c — Organization type management view's "properties
// currently assigned" list.
export async function listPropertiesByLlc(accountId: string, llcId: string) {
  return supabase
    .from('properties')
    .select('id, name, address')
    .eq('account_id', accountId)
    .eq('llc_id', llcId)
    .order('address')
    .returns<PropertyForOrganizationType[]>()
}

// Roadmap 8.2c — reassign a property to a different Organization type
// (or to Individual ownership, via null) directly from that entity's own
// management view, without going through the property's own edit form.
export async function updatePropertyLlc(id: string, llcId: string | null) {
  return supabase.from('properties').update({ llc_id: llcId }).eq('id', id).select('id, llc_id').single()
}
