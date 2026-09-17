import { supabase } from '../../shared/supabaseClient'

export interface MileageRollupRow {
  property_id: string
  miles_driven: string | null
  property: { name: string; address: string | null } | null
}

interface MileageRollupFilters {
  year?: number
}

// Rollup source for the Financials (2.3) mileage summary — reads
// capture_log's 'mileage' entries directly (roadmap 1.6 folded the
// former standalone mileage_log table into Quick Capture as a 4th
// entry type, per the Single Source of Truth rule: one place miles get
// logged, not two). The summing happens in mileageCalculations.ts, same
// split as Financials' own summary.
export async function listMileageForRollup(accountId: string, filters: MileageRollupFilters = {}) {
  let query = supabase
    .from('capture_log')
    .select('property_id, miles_driven, property:properties(name, address)')
    .eq('account_id', accountId)
    .eq('entry_type', 'mileage')
    .eq('voided', false)

  if (filters.year) {
    query = query.gte('entry_date', `${filters.year}-01-01`).lte('entry_date', `${filters.year}-12-31`)
  }

  return query.returns<MileageRollupRow[]>()
}
