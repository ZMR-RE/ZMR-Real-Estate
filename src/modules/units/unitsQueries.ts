import { supabase } from '../../shared/supabaseClient'

export interface Unit {
  id: string
  property_id: string
  unit_label: string
  status: string
  updated_at: string
  archived: boolean
}

export interface UnitInput {
  unit_label: string
  status: string
}

const UNIT_COLUMNS = 'id, property_id, unit_label, status, updated_at, archived'

export async function listUnits(accountId: string, propertyId: string) {
  return supabase
    .from('units')
    .select(UNIT_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('unit_label')
    .returns<Unit[]>()
}

export async function createUnit(accountId: string, propertyId: string, input: UnitInput) {
  return supabase
    .from('units')
    .insert({ account_id: accountId, property_id: propertyId, ...input })
    .select(UNIT_COLUMNS)
    .single()
}

export async function updateUnit(id: string, input: UnitInput) {
  return supabase.from('units').update(input).eq('id', id).select(UNIT_COLUMNS).single()
}

// Roadmap 8.12 — archive/restore, same soft-delete pattern as
// setFinancialAccountArchived/setLlcArchived: a unit referenced by
// historical capture/transaction/lease rows must never be hard-deleted,
// just stop being offered as a choice going forward.
export async function setUnitArchived(id: string, archived: boolean) {
  return supabase.from('units').update({ archived }).eq('id', id).select(UNIT_COLUMNS).single()
}
