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
export async function listMortgagePaymentsForAccount(accountId: string, filters: MortgagePaymentFilters = {}) {
  let query = supabase.from('mortgage_payments').select('property_id, principal_amount').eq('account_id', accountId)

  if (filters.year) {
    query = query.gte('payment_date', `${filters.year}-01-01`).lte('payment_date', `${filters.year}-12-31`)
  }

  return query.returns<MortgagePaymentPrincipal[]>()
}
