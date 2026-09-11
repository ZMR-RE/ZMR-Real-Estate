import { supabase } from '../../shared/supabaseClient'

export interface PropertySpec {
  id: string
  property_id: string
  unit_id: string | null
  label: string
  value: string
  updated_at: string
}

export interface PropertySpecInput {
  label: string
  value: string
}

// unitId null means property-level specs; a real id scopes to that unit
// only — the two never mix in one listing (roadmap 7.2).
export async function listPropertySpecs(accountId: string, propertyId: string, unitId: string | null) {
  let query = supabase
    .from('property_specs')
    .select('id, property_id, unit_id, label, value, updated_at')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('label')

  query = unitId ? query.eq('unit_id', unitId) : query.is('unit_id', null)

  return query.returns<PropertySpec[]>()
}

export async function createPropertySpec(
  accountId: string,
  propertyId: string,
  unitId: string | null,
  input: PropertySpecInput,
) {
  return supabase
    .from('property_specs')
    .insert({ account_id: accountId, property_id: propertyId, unit_id: unitId, ...input })
    .select('id, property_id, unit_id, label, value, updated_at')
    .single()
}

export async function updatePropertySpec(id: string, input: PropertySpecInput) {
  return supabase
    .from('property_specs')
    .update(input)
    .eq('id', id)
    .select('id, property_id, unit_id, label, value, updated_at')
    .single()
}
