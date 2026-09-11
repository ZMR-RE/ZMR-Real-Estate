import { supabase } from '../../shared/supabaseClient'

export interface Vendor {
  id: string
  account_id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  has_w9: boolean
  has_insurance: boolean
  split_percentage: number | null
  split_description: string | null
}

export type VendorInput = Omit<Vendor, 'id' | 'account_id' | 'split_percentage' | 'split_description'>

export interface VendorSplitRuleInput {
  splitPercentage: number | null
  splitDescription: string | null
}

const VENDOR_COLUMNS =
  'id, account_id, name, contact_email, contact_phone, has_w9, has_insurance, split_percentage, split_description'

export async function listVendors(accountId: string) {
  return supabase.from('vendors').select(VENDOR_COLUMNS).eq('account_id', accountId).order('name').returns<Vendor[]>()
}

export async function createVendor(accountId: string, input: VendorInput) {
  return supabase.from('vendors').insert({ ...input, account_id: accountId }).select(VENDOR_COLUMNS).single()
}

// Scoped to just the split-rule fields — there's no general vendor-edit
// screen yet, only this one (roadmap 8.8).
export async function updateVendorSplitRule(vendorId: string, input: VendorSplitRuleInput) {
  return supabase
    .from('vendors')
    .update({ split_percentage: input.splitPercentage, split_description: input.splitDescription })
    .eq('id', vendorId)
    .select(VENDOR_COLUMNS)
    .single()
}
