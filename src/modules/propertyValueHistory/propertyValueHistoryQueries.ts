import { supabase } from '../../shared/supabaseClient'

export type ValueMetric = 'market_value' | 'rent_value'

export interface PropertyValueLogEntry {
  id: string
  property_id: string
  metric: ValueMetric
  value: string
  source: string
  entry_date: string
  voided: boolean
}

export type PropertyValueLogInput = Omit<PropertyValueLogEntry, 'id' | 'property_id' | 'metric' | 'voided'>

export interface LatestPropertyValue {
  property_id: string
  metric: ValueMetric
  value: string
  source: string
  entry_date: string
}

// Fetches voided rows too (not just active), same as mortgage_payments/
// mortgage_escrow_transactions — the list stays the full history with
// voided entries visibly marked, rather than making them disappear.
export async function listValueLog(propertyId: string, metric: ValueMetric) {
  return supabase
    .from('property_value_logs')
    .select('id, property_id, metric, value, source, entry_date, voided')
    .eq('property_id', propertyId)
    .eq('metric', metric)
    .order('entry_date', { ascending: false })
    .returns<PropertyValueLogEntry[]>()
}

export async function createValueLogEntry(
  accountId: string,
  propertyId: string,
  metric: ValueMetric,
  input: PropertyValueLogInput,
) {
  return supabase
    .from('property_value_logs')
    .insert({ ...input, metric, account_id: accountId, property_id: propertyId })
    .select()
    .single()
}

// The only "removal" path for a value log entry (matches mortgage_payments/
// mortgage_escrow_transactions, roadmap 9.20) — never a hard DELETE.
export async function voidValueLogEntry(id: string) {
  return supabase
    .from('property_value_logs')
    .update({ voided: true, voided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

// Bulk "latest value per property" for one metric across the whole
// account — powers the Portfolio KPI rollup and Balance Sheet report,
// which need every property's latest market value in one request rather
// than one query per property. Reads the property_latest_values view
// (one non-voided row per property/metric, most recent entry_date).
export async function listLatestValuesForAccount(accountId: string, metric: ValueMetric) {
  return supabase
    .from('property_latest_values')
    .select('property_id, metric, value, source, entry_date')
    .eq('account_id', accountId)
    .eq('metric', metric)
    .returns<LatestPropertyValue[]>()
}

// Single-property convenience — the Mortgage tab's equity/LTV calc only
// needs one property's latest market value, not the whole account.
export async function getLatestValue(accountId: string, propertyId: string, metric: ValueMetric) {
  return supabase
    .from('property_latest_values')
    .select('property_id, metric, value, source, entry_date')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .eq('metric', metric)
    .maybeSingle()
    .returns<LatestPropertyValue | null>()
}
