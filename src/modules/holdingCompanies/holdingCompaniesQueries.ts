import { supabase } from '../../shared/supabaseClient'

export interface HoldingCompany {
  id: string
  account_id: string
  name: string
}

export type HoldingCompanyInput = Omit<HoldingCompany, 'id' | 'account_id'>

const HOLDING_COMPANY_COLUMNS = 'id, account_id, name'

export async function listHoldingCompanies(accountId: string) {
  return supabase.from('holding_companies').select(HOLDING_COMPANY_COLUMNS).eq('account_id', accountId).order('name')
}

export async function createHoldingCompany(accountId: string, input: HoldingCompanyInput) {
  return supabase
    .from('holding_companies')
    .insert({ ...input, account_id: accountId })
    .select(HOLDING_COMPANY_COLUMNS)
    .single()
}
