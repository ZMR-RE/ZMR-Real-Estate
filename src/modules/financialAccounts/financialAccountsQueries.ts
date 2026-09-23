import { supabase } from '../../shared/supabaseClient'

export type FinancialAccountType = 'bank' | 'credit_card'

export interface FinancialAccount {
  id: string
  property_id: string | null
  llc_id: string | null
  account_type: FinancialAccountType
  nickname: string
  last_four: string
  archived: boolean
}

export type FinancialAccountInput = Pick<FinancialAccount, 'account_type' | 'nickname' | 'last_four'>

// Roadmap 7.40 — a property may keep its own property-specific account
// in addition to its LLC's shared ones (no forced either/or), so scope
// is exactly one of these, never both/neither — matches the DB check
// constraint.
export type FinancialAccountScope = { propertyId: string } | { llcId: string }

const FINANCIAL_ACCOUNT_COLUMNS = 'id, property_id, llc_id, account_type, nickname, last_four, archived'

// Roadmap 7.18 — hard rule: never a full account/card number, nickname +
// last 4 only. last_four's format is enforced at the DB level (see the
// migration's check constraint), but validating here too gives an
// immediate, specific error instead of a raw constraint-violation message.
export function isValidLastFour(value: string): boolean {
  return /^\d{4}$/.test(value)
}

// A property's own accounts only — never includes its LLC's shared
// ones. Used by the Financial accounts box's own editable list (that
// box only owns/edits property-scoped rows; the LLC's shared accounts
// are shown there separately, read-only, via listLlcFinancialAccounts).
export async function listPropertyFinancialAccounts(accountId: string, propertyId: string) {
  return supabase
    .from('property_financial_accounts')
    .select(FINANCIAL_ACCOUNT_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('created_at')
    .returns<FinancialAccount[]>()
}

// An LLC's shared accounts — used by both the LLC-level accounts panel
// (Settings → Organization Types) and, read-only, by every property
// under that LLC.
export async function listLlcFinancialAccounts(accountId: string, llcId: string) {
  return supabase
    .from('property_financial_accounts')
    .select(FINANCIAL_ACCOUNT_COLUMNS)
    .eq('account_id', accountId)
    .eq('llc_id', llcId)
    .order('created_at')
    .returns<FinancialAccount[]>()
}

// Roadmap 7.40 — Quick Capture's payment-method picker: every account
// usable when logging an entry for this property, the property's own
// plus (if it belongs to an LLC) that LLC's shared accounts, unioned
// into one list. llcId is null for an Individual-ownership property,
// in which case this is equivalent to listPropertyFinancialAccounts.
export async function listFinancialAccountsForEntry(accountId: string, propertyId: string, llcId: string | null) {
  const scopeFilter = llcId ? `property_id.eq.${propertyId},llc_id.eq.${llcId}` : `property_id.eq.${propertyId}`
  return supabase
    .from('property_financial_accounts')
    .select(FINANCIAL_ACCOUNT_COLUMNS)
    .eq('account_id', accountId)
    .or(scopeFilter)
    .order('created_at')
    .returns<FinancialAccount[]>()
}

export async function createFinancialAccount(accountId: string, scope: FinancialAccountScope, input: FinancialAccountInput) {
  const scopeFields = 'propertyId' in scope ? { property_id: scope.propertyId } : { llc_id: scope.llcId }
  return supabase
    .from('property_financial_accounts')
    .insert({ account_id: accountId, ...scopeFields, ...input })
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
