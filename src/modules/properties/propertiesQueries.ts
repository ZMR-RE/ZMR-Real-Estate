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
  // Roadmap 7.39 (3) — Ownership subsection, inside Purchase & valuation.
  owner_name: string | null
  contact_phone: string | null
  // Batch I5 — the optimistic-concurrency token for updateProperty below.
  // Maintained by the properties_set_updated_at trigger
  // (20260925080000), never by client code.
  updated_at: string
}

export type PropertyInput = Omit<Property, 'id' | 'account_id' | 'updated_at'>

const PROPERTY_COLUMNS =
  'id, account_id, name, llc_id, address, city, state, zip, insurance_provider, insurance_policy_number, contact_email, purchase_price, status, purchase_date, property_type, purchase_method, property_tax_id, county, township, square_footage, lot_size, municipal_zoning_code, county_assessor_use_code, bedroom_count, bathroom_count, basement, garage_spaces, street_parking, parking_notes, lot_size_value, lot_size_unit, year_built, exterior_wall_materials, owner_name, contact_phone, updated_at'

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

export type UpdatePropertyResult =
  | { kind: 'saved'; property: Property }
  // Another editor saved since `expectedUpdatedAt` was read. Nothing was
  // written. `latest` is the row as it is now, for the user to review.
  | { kind: 'conflict'; latest: Property }
  // The row is gone, or RLS no longer lets this user see it.
  | { kind: 'not_found' }
  | { kind: 'error'; message: string }

// Batch I5 — stale-edit protection, enforced at the database boundary.
// The UPDATE carries `.eq('updated_at', expectedUpdatedAt)`: if any other
// save has landed since the caller read the row, the trigger from
// 20260925080000_properties_set_updated_at.sql has moved updated_at, the
// filter matches zero rows, and Postgres writes nothing — the newer save
// cannot be overwritten no matter what the client believes. A zero-row
// UPDATE with .single() surfaces as PGRST116; a follow-up read then
// distinguishes a genuine conflict (row still visible, timestamp moved)
// from a row that is gone or no longer accessible. Both this UPDATE and
// the follow-up read run under the caller's own RLS, so a member of a
// different account gets not_found, never another account's row.
//
// Returns the updated row directly on success so callers can reflect a
// save from this response alone, without a separate re-fetch.
export async function updateProperty(id: string, input: PropertyInput, expectedUpdatedAt: string): Promise<UpdatePropertyResult> {
  // PropertyForm seeds its draft by spreading the whole Property row, so at
  // runtime `input` can still carry id/account_id/updated_at even though
  // PropertyInput's type omits them. Never send those in the SET clause:
  // updated_at is the trigger's to write, and the other two must not be
  // client-assignable.
  const payload: Record<string, unknown> = { ...input }
  delete payload.id
  delete payload.account_id
  delete payload.updated_at

  const { data, error } = await supabase
    .from('properties')
    .update(payload)
    .eq('id', id)
    .eq('updated_at', expectedUpdatedAt)
    .select(PROPERTY_COLUMNS)
    .returns<Property[]>()
    .single()

  if (data) return { kind: 'saved', property: data }
  if (error && error.code !== 'PGRST116') return { kind: 'error', message: error.message }

  const { data: latest } = await supabase
    .from('properties')
    .select(PROPERTY_COLUMNS)
    .eq('id', id)
    .returns<Property[]>()
    .maybeSingle()

  return latest ? { kind: 'conflict', latest } : { kind: 'not_found' }
}

