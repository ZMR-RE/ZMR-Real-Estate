import { supabase } from '../../shared/supabaseClient'

export type PeriodStatus = 'open' | 'locked'

export interface FinancialPeriod {
  id: string
  account_id: string
  year: number
  status: PeriodStatus
}

export async function getFinancialPeriod(accountId: string, year: number) {
  return supabase
    .from('financial_periods')
    .select('id, account_id, year, status')
    .eq('account_id', accountId)
    .eq('year', year)
    .maybeSingle<FinancialPeriod>()
}

// First lock for a year creates the row; the DB trigger that logs to the
// audit trail only fires on UPDATE, so a brand-new lock isn't logged —
// only every lock/reopen after that first one is, since those are always
// updates to an existing row. Matches the roadmap wording, which only
// requires the reopen action to be logged.
export async function lockPeriod(accountId: string, year: number, existingId: string | null) {
  if (existingId) {
    return supabase
      .from('financial_periods')
      .update({ status: 'locked' })
      .eq('id', existingId)
      .select('id, account_id, year, status')
      .single()
  }

  return supabase
    .from('financial_periods')
    .insert({ account_id: accountId, year, status: 'locked' })
    .select('id, account_id, year, status')
    .single()
}

export async function reopenPeriod(periodId: string) {
  return supabase
    .from('financial_periods')
    .update({ status: 'open' })
    .eq('id', periodId)
    .select('id, account_id, year, status')
    .single()
}
