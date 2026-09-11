import { supabase } from '../../shared/supabaseClient'

export interface Vendor {
  id: string
  account_id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  has_w9: boolean
  has_insurance: boolean
}

export type VendorInput = Omit<Vendor, 'id' | 'account_id'>

const VENDOR_COLUMNS = 'id, account_id, name, contact_email, contact_phone, has_w9, has_insurance'

export async function listVendors(accountId: string) {
  return supabase.from('vendors').select(VENDOR_COLUMNS).eq('account_id', accountId).order('name')
}

export async function createVendor(accountId: string, input: VendorInput) {
  return supabase.from('vendors').insert({ ...input, account_id: accountId }).select(VENDOR_COLUMNS).single()
}
