import { supabase } from '../../shared/supabaseClient'

export type UtilityResponsibility = 'Owner' | 'Tenant' | 'Split'

export interface UtilityRecord {
  id: string
  property_id: string
  unit_id: string | null
  utility_type: string
  responsibility: UtilityResponsibility
  notes: string | null
  // Roadmap 7.31 — Provider name/contact added to the existing box (not
  // a new section).
  provider_name: string | null
  provider_contact: string | null
  updated_at: string
}

export interface UtilityRecordInput {
  utility_type: string
  responsibility: UtilityResponsibility
  notes: string | null
  provider_name: string | null
  provider_contact: string | null
}

const UTILITY_RECORD_COLUMNS =
  'id, property_id, unit_id, utility_type, responsibility, notes, provider_name, provider_contact, updated_at'

// unitId null lists building-level records only; a real id lists that
// unit's records only — the two scopes never mix in one listing, same
// convention as property_specs (7.4).
export async function listUtilityRecords(accountId: string, propertyId: string, unitId: string | null) {
  let query = supabase
    .from('utility_records')
    .select(UTILITY_RECORD_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('utility_type')

  query = unitId ? query.eq('unit_id', unitId) : query.is('unit_id', null)

  return query.returns<UtilityRecord[]>()
}

export async function createUtilityRecord(
  accountId: string,
  propertyId: string,
  unitId: string | null,
  input: UtilityRecordInput,
) {
  return supabase
    .from('utility_records')
    .insert({ account_id: accountId, property_id: propertyId, unit_id: unitId, ...input })
    .select(UTILITY_RECORD_COLUMNS)
    .single()
}

export async function updateUtilityRecord(id: string, input: UtilityRecordInput) {
  return supabase
    .from('utility_records')
    .update(input)
    .eq('id', id)
    .select(UTILITY_RECORD_COLUMNS)
    .single()
}
