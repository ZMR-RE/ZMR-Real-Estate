import { supabase } from '../../shared/supabaseClient'

export interface MortgagePaymentPrincipal {
  property_id: string
  principal_amount: number
}

export interface MortgagePaymentFilters {
  year?: number | null
}

// The one query these reports need that doesn't already have a home
// elsewhere: an account-wide (not per-property) read of principal paid,
// for Cash Flow's financing-activity line and the Balance Sheet's cash
// calculation. Everything else the reports use (transactions, chart of
// accounts, category mappings, portfolio mortgage balances) already has
// a query function in its own module — reused, not duplicated.
//
// voided = false: unlike the Mortgage tab's own payment history (which
// intentionally keeps voided rows visible as an audit trail), these
// portfolio-wide figures should never include a payment against a
// fabricated/erroneous loan just because it happened to get logged
// before someone caught the mistake and voided it.
export async function listMortgagePaymentsForAccount(accountId: string, filters: MortgagePaymentFilters = {}) {
  let query = supabase
    .from('mortgage_payments')
    .select('property_id, principal_amount')
    .eq('account_id', accountId)
    .eq('voided', false)

  if (filters.year) {
    query = query.gte('payment_date', `${filters.year}-01-01`).lte('payment_date', `${filters.year}-12-31`)
  }

  return query.returns<MortgagePaymentPrincipal[]>()
}

// Option B (H1): history-only mortgage payments live in their own table
// (T1's H2 migration — contract v5, design C). They are already included in a
// loan's statement opening balance, so Reports never deduct them from cash
// (R2) and only disclose them (R2/R3). Until H2 is applied the table doesn't
// exist; reportsHistory.resolveHistoryPrincipal turns exactly that answer into
// "no history entries" and keeps every other error an error.
export const HISTORY_PAYMENTS_TABLE = 'mortgage_history_payments'

export interface HistoryPaymentPrincipal {
  property_id: string
  principal_amount: number
}

export async function listHistoryPaymentPrincipalsForAccount(accountId: string, filters: MortgagePaymentFilters = {}) {
  let query = supabase
    .from(HISTORY_PAYMENTS_TABLE)
    .select('property_id, principal_amount')
    .eq('account_id', accountId)
    .eq('voided', false)

  if (filters.year) {
    query = query.gte('payment_date', `${filters.year}-01-01`).lte('payment_date', `${filters.year}-12-31`)
  }

  return query.returns<HistoryPaymentPrincipal[]>()
}
