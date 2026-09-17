import { supabase } from '../../shared/supabaseClient'

export type FinancialAccountType = 'bank' | 'credit_card'

export interface FinancialAccount {
  id: string
  property_id: string
  account_type: FinancialAccountType
  nickname: string
  last_four: string
  archived: boolean
}

export type FinancialAccountInput = Pick<FinancialAccount, 'account_type' | 'nickname' | 'last_four'>

const FINANCIAL_ACCOUNT_COLUMNS = 'id, property_id, account_type, nickname, last_four, archived'

// Roadmap 7.18 — hard rule: never a full account/card number, nickname +
// last 4 only. last_four's format is enforced at the DB level (see the
// migration's check constraint), but validating here too gives an
// immediate, specific error instead of a raw constraint-violation message.
export function isValidLastFour(value: string): boolean {
  return /^\d{4}$/.test(value)
}

export async function listFinancialAccounts(accountId: string, propertyId: string) {
  return supabase
    .from('property_financial_accounts')
    .select(FINANCIAL_ACCOUNT_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('created_at')
    .returns<FinancialAccount[]>()
}

export async function createFinancialAccount(accountId: string, propertyId: string, input: FinancialAccountInput) {
  return supabase
    .from('property_financial_accounts')
    .insert({ account_id: accountId, property_id: propertyId, ...input })
    .select(FINANCIAL_ACCOUNT_COLUMNS)
    .single<FinancialAccount>()
}

export async function updateFinancialAccount(id: string, input: FinancialAccountInput) {
  return supabase
    .from('property_financial_accounts')
    .update(input)
    .eq('id', id)
    .select(FINANCIAL_ACCOUNT_COLUMNS)
    .single<FinancialAccount>()
}

export async function setFinancialAccountArchived(id: string, archived: boolean) {
  return supabase
    .from('property_financial_accounts')
    .update({ archived })
    .eq('id', id)
    .select(FINANCIAL_ACCOUNT_COLUMNS)
    .single<FinancialAccount>()
}
