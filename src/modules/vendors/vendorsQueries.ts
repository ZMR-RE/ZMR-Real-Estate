import { supabase } from '../../shared/supabaseClient'

export interface Vendor {
  id: string
  account_id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  has_w9: boolean
  has_insurance: boolean
  // Roadmap 1.28 revision — persistent to the vendor record itself
  // (distinct from any one Quick Capture Visit's own per-encounter
  // notes). relationship is a pick-list value (vendor_relationship),
  // not a fixed enum, per the pick-list-first convention.
  relationship: string | null
  // Roadmap 1.31 — same pick-list-first convention (vendor_type:
  // Store/Contractor/Service provider/Other).
  vendor_type: string | null
  notes: string | null
  // Roadmap 8.11(a) — fixed 1-5 scale, deliberately not pick-list-backed
  // (see the migration's own comment: same class of exception as State).
  reliability_rating: number | null
  split_percentage: number | null
  split_description: string | null
  archived: boolean
}

export type VendorInput = Omit<Vendor, 'id' | 'account_id' | 'split_percentage' | 'split_description' | 'archived'>

export interface VendorSplitRuleInput {
  splitPercentage: number | null
  splitDescription: string | null
}

const VENDOR_COLUMNS =
  'id, account_id, name, contact_email, contact_phone, has_w9, has_insurance, relationship, vendor_type, notes, reliability_rating, split_percentage, split_description, archived'

export async function listVendors(accountId: string) {
  return supabase.from('vendors').select(VENDOR_COLUMNS).eq('account_id', accountId).order('name').returns<Vendor[]>()
}

export async function createVendor(accountId: string, input: VendorInput) {
  return supabase.from('vendors').insert({ ...input, account_id: accountId }).select(VENDOR_COLUMNS).single()
}

// Roadmap 1.28 revision — general vendor edit (name/contact/W9/
// insurance/relationship/notes), added alongside VendorList's new Edit
// action so Relationship and Notes are reachable after a vendor is first
// created, not just at creation time. Scoped to VendorInput's fields
// only — split-rule fields keep their own updateVendorSplitRule below,
// and archived keeps setVendorArchived, same separation Organization
// type uses (updateLlc vs setLlcArchived).
export async function updateVendor(id: string, input: VendorInput) {
  return supabase.from('vendors').update(input).eq('id', id).select(VENDOR_COLUMNS).single()
}

// Roadmap 1.17 — archive/restore for Vendor's new Settings management
// view, same soft-delete pattern as Organization type (setLlcArchived):
// a vendor referenced by historical capture/transaction rows must never
// be hard-deleted, just stop being offered as a choice going forward.
export async function setVendorArchived(id: string, archived: boolean) {
  return supabase.from('vendors').update({ archived }).eq('id', id).select(VENDOR_COLUMNS).single()
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
