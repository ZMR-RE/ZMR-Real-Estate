import { supabase } from '../supabaseClient'

// The dropdowns roadmap item 8.1's generic pick-list system backs.
// financial_transactions category (the fixed Schedule-E-aligned enum) is
// deliberately not one of these — see 20260910220000_pick_list_options.sql
// for why. unit_status was added by 20260911130000_units.sql (roadmap 7.2).
// listing_platform was added by 20260911150000_leasing_listings.sql
// (roadmap 7.3), left with zero seeded options — see that migration.
// utility_type was added by 20260915120000_utility_records.sql (roadmap
// 7.12), also left with zero seeded options — no established taxonomy to
// carry forward. contact_method was added by
// 20260918170000_capture_log_type_fields.sql (roadmap 1.7 correction),
// seeded with the 4 values that item specified (phone/email/text/
// in-person) — an explicitly given taxonomy, not a guess.
// property_type/purchase_method/zoning_use_code were added
// by the Property Overview redesign, converting three fields that were
// previously plain free text on properties — same reasoning as
// subcategory/payment_method above, zero seeded options since there's no
// established, enforced taxonomy to carry forward (each property's
// existing free-text value still displays via PickListSelect's
// current-value fallback even before an account adds any options).
// properties.state is NOT one of these — it's a fixed 50-state dropdown
// (src/shared/usStates.ts), not an account-editable pick list. visit_type
// was added by 20260921090000_capture_log_visit_type.sql (roadmap 1.20),
// seeded with the 7 values that item specified — an explicitly given
// taxonomy, not a guess, same as contact_method's seed.
// financial_transactions.repair_or_improvement (and Quick Capture's copy
// of it, capture_log.repair_or_improvement, roadmap 1.16) is deliberately
// NOT one of these either — kept as a fixed 2-value dropdown so the two
// stay in lockstep with each other, since a capture entry's value has to
// match the fixed enum a reconciled financial_transaction row accepts.
// payment_how was added by 20260921130000_capture_log_financial_account.sql
// (roadmap 1.16 correction) — Quick Capture's Receipt "how was this
// financial account used" selector (Debit card/Check/Zelle/ACH),
// deliberately a SEPARATE list from payment_method: Financials'
// TransactionForm still uses payment_method for its own unrelated flat
// field, and capture_log.payment_method (the column) now sources its
// value from this list instead, once a financial_account_id is picked.
// vendor_relationship was added by
// 20260921170000_vendors_relationship_notes.sql (roadmap 1.28 revision)
// — a persistent tag on the Vendor record itself (Used/Estimate
// obtained/Recommended/Do not use), seeded with those 4 explicitly
// given values, same precedent as contact_method/visit_type's seeds.
// vendor_type was added by 20260921190000_vendor_type.sql (roadmap
// 1.31), seeded with Store/Contractor/Service provider/Other — same
// precedent again. capture_log.receipt_type (added alongside it,
// roadmap 1.31's "Paid to"/"Received from" refinement — groundwork for
// 1.33; renamed from entry_direction and widened to a 3rd value,
// Refund/Return, by 20260922000000) is deliberately NOT one of these: a
// fixed enum, same reasoning as repair_or_improvement below.
export type PickListName =
  | 'subcategory'
  | 'payment_method'
  | 'payment_how'
  | 'document_type'
  | 'task_type'
  | 'unit_status'
  | 'listing_platform'
  | 'utility_type'
  | 'property_type'
  | 'purchase_method'
  | 'zoning_use_code'
  | 'contact_method'
  | 'visit_type'
  | 'vendor_relationship'
  | 'vendor_type'

export interface PickListOption {
  id: string
  list_name: PickListName
  value: string
  active: boolean
}

export async function listOptions(accountId: string, listName: PickListName) {
  return supabase
    .from('pick_list_options')
    .select('id, list_name, value, active')
    .eq('account_id', accountId)
    .eq('list_name', listName)
    .order('value', { ascending: true })
    .returns<PickListOption[]>()
}

// Adding a value that already exists but was archived reactivates it
// instead of erroring on the unique (account_id, list_name, value)
// constraint — the natural inverse of archiving, not a new option.
export async function addOption(accountId: string, listName: PickListName, value: string) {
  const trimmed = value.trim()

  const { data: existing, error: lookupError } = await supabase
    .from('pick_list_options')
    .select('id, list_name, value, active')
    .eq('account_id', accountId)
    .eq('list_name', listName)
    .eq('value', trimmed)
    .maybeSingle<PickListOption>()

  if (lookupError) {
    return { data: null, error: lookupError }
  }

  if (existing) {
    if (existing.active) {
      return { data: existing, error: null }
    }
    return setOptionActive(existing.id, true)
  }

  return supabase
    .from('pick_list_options')
    .insert({ account_id: accountId, list_name: listName, value: trimmed })
    .select('id, list_name, value, active')
    .single<PickListOption>()
}

export async function setOptionActive(id: string, active: boolean) {
  return supabase
    .from('pick_list_options')
    .update({ active })
    .eq('id', id)
    .select('id, list_name, value, active')
    .single<PickListOption>()
}
