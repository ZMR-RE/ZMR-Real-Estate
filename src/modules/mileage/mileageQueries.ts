import { supabase } from '../../shared/supabaseClient'

export interface MileageEntryInput {
  accountId: string
  propertyId: string
  loggedBy: string
  logDate: string
  miles: number
  purpose: string | null
}

export async function createMileageEntry(input: MileageEntryInput) {
  return supabase
    .from('mileage_log')
    .insert({
      account_id: input.accountId,
      property_id: input.propertyId,
      logged_by: input.loggedBy,
      log_date: input.logDate,
      miles: input.miles,
      purpose: input.purpose,
    })
    .select()
    .single()
}

export interface MileageRollupRow {
  property_id: string
  miles: number
  property: { name: string } | null
}

interface MileageRollupFilters {
  year?: number
}

// Rollup source for the Financials (2.3) mileage summary — raw per-entry
// rows with just enough to aggregate by property; the summing happens in
// mileageCalculations.ts, same split as Financials' own summary.
export async function listMileageForRollup(accountId: string, filters: MileageRollupFilters = {}) {
  let query = supabase
    .from('mileage_log')
    .select('property_id, miles, property:properties(name)')
    .eq('account_id', accountId)

  if (filters.year) {
    query = query.gte('log_date', `${filters.year}-01-01`).lte('log_date', `${filters.year}-12-31`)
  }

  return query.returns<MileageRollupRow[]>()
}
