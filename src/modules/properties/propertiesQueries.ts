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
}

export type PropertyInput = Omit<Property, 'id' | 'account_id'>

export async function listProperties(accountId: string) {
  return supabase
    .from('properties')
    .select(
      'id, account_id, name, llc_id, address, city, state, zip, insurance_provider, insurance_policy_number, contact_email, purchase_price, status',
    )
    .eq('account_id', accountId)
    .order('address')
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
