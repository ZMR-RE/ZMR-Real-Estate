import { supabase } from '../supabaseClient'

// The dropdowns roadmap item 8.1's generic pick-list system backs.
// financial_transactions category (the fixed Schedule-E-aligned enum) is
// deliberately not one of these — see 20260910220000_pick_list_options.sql
// for why. unit_status was added by 20260911130000_units.sql (roadmap 7.2).
// listing_platform was added by 20260911150000_leasing_listings.sql
// (roadmap 7.3), left with zero seeded options — see that migration.
// utility_type was added by 20260915120000_utility_records.sql (roadmap
// 7.12), also left with zero seeded options — no established taxonomy to
// carry forward.
export type PickListName =
  | 'subcategory'
  | 'payment_method'
  | 'document_type'
  | 'task_type'
  | 'unit_status'
  | 'listing_platform'
  | 'utility_type'

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
