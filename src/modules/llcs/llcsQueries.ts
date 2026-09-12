import { supabase } from '../../shared/supabaseClient'

export interface Llc {
  id: string
  account_id: string
  name: string
  ein: string | null
  formation_state: string | null
  registered_agent: string | null
  formation_date: string | null
  annual_report_due_date: string | null
  holding_company_id: string | null
  holding_company: { id: string; name: string } | null
}

export type LlcInput = Omit<Llc, 'id' | 'account_id' | 'holding_company'>

const LLC_COLUMNS =
  'id, account_id, name, ein, formation_state, registered_agent, formation_date, annual_report_due_date, holding_company_id, holding_company:holding_companies(id, name)'

export async function listLlcs(accountId: string) {
  return supabase.from('llcs').select(LLC_COLUMNS).eq('account_id', accountId).order('name').returns<Llc[]>()
}

export async function createLlc(accountId: string, input: LlcInput) {
  return supabase
    .from('llcs')
    .insert({ ...input, account_id: accountId })
    .select(LLC_COLUMNS)
    .returns<Llc[]>()
    .single()
}
