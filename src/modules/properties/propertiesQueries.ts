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
  unit_config: string | null
  insurance_provider: string | null
  insurance_policy_number: string | null
  contact_email: string | null
  market_value: string | null
  status: 'active' | 'inactive'
}

export type PropertyInput = Omit<Property, 'id' | 'account_id'>

export async function listProperties(accountId: string) {
  return supabase
    .from('properties')
    .select(
      'id, account_id, name, llc_id, address, city, state, zip, unit_config, insurance_provider, insurance_policy_number, contact_email, market_value, status',
    )
    .eq('account_id', accountId)
    .order('name')
}

export async function createProperty(accountId: string, input: PropertyInput) {
  return supabase
    .from('properties')
    .insert({ ...input, account_id: accountId })
    .select()
    .single()
}

export async function updateProperty(id: string, input: PropertyInput) {
  return supabase.from('properties').update(input).eq('id', id).select().single()
}
