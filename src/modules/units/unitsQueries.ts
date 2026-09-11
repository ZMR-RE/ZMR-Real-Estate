import { supabase } from '../../shared/supabaseClient'

export interface Unit {
  id: string
  property_id: string
  unit_label: string
  status: string
  updated_at: string
}

export interface UnitInput {
  unit_label: string
  status: string
}

export async function listUnits(accountId: string, propertyId: string) {
  return supabase
    .from('units')
    .select('id, property_id, unit_label, status, updated_at')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('unit_label')
    .returns<Unit[]>()
}

export async function createUnit(accountId: string, propertyId: string, input: UnitInput) {
  return supabase
    .from('units')
    .insert({ account_id: accountId, property_id: propertyId, ...input })
    .select('id, property_id, unit_label, status, updated_at')
    .single()
}

export async function updateUnit(id: string, input: UnitInput) {
  return supabase
    .from('units')
    .update(input)
    .eq('id', id)
    .select('id, property_id, unit_label, status, updated_at')
    .single()
}
