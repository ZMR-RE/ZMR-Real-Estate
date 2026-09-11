import { supabase } from '../../shared/supabaseClient'

export interface LeasingListing {
  id: string
  property_id: string
  unit_id: string
  platform: string
  date_posted: string
  notes: string | null
  updated_at: string
}

export interface LeasingListingInput {
  platform: string
  date_posted: string
  notes: string | null
}

export async function listLeasingListings(accountId: string, unitId: string) {
  return supabase
    .from('leasing_listings')
    .select('id, property_id, unit_id, platform, date_posted, notes, updated_at')
    .eq('account_id', accountId)
    .eq('unit_id', unitId)
    .order('date_posted', { ascending: false })
    .returns<LeasingListing[]>()
}

export async function createLeasingListing(
  accountId: string,
  propertyId: string,
  unitId: string,
  input: LeasingListingInput,
) {
  return supabase
    .from('leasing_listings')
    .insert({ account_id: accountId, property_id: propertyId, unit_id: unitId, ...input })
    .select('id, property_id, unit_id, platform, date_posted, notes, updated_at')
    .single()
}

export async function updateLeasingListing(id: string, input: LeasingListingInput) {
  return supabase
    .from('leasing_listings')
    .update(input)
    .eq('id', id)
    .select('id, property_id, unit_id, platform, date_posted, notes, updated_at')
    .single()
}
