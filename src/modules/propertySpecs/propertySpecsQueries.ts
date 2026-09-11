import { supabase } from '../../shared/supabaseClient'

export interface PropertySpec {
  id: string
  property_id: string
  label: string
  value: string
  updated_at: string
}

export interface PropertySpecInput {
  label: string
  value: string
}

export async function listPropertySpecs(accountId: string, propertyId: string) {
  return supabase
    .from('property_specs')
    .select('id, property_id, label, value, updated_at')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('label')
    .returns<PropertySpec[]>()
}

export async function createPropertySpec(
  accountId: string,
  propertyId: string,
  input: PropertySpecInput,
) {
  return supabase
    .from('property_specs')
    .insert({ account_id: accountId, property_id: propertyId, ...input })
    .select('id, property_id, label, value, updated_at')
    .single()
}

export async function updatePropertySpec(id: string, input: PropertySpecInput) {
  return supabase
    .from('property_specs')
    .update(input)
    .eq('id', id)
    .select('id, property_id, label, value, updated_at')
    .single()
}
