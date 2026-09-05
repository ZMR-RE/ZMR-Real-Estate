import { supabase } from '../../shared/supabaseClient'

export interface MortgageDetails {
  id: string
  property_id: string
  lender_name: string | null
  original_loan_amount: string
  current_balance: string
  interest_rate: string
  monthly_payment: string
  loan_start_date: string
  term_years: number
}

export type MortgageDetailsInput = Omit<MortgageDetails, 'id' | 'property_id'>

export async function getMortgageDetails(propertyId: string) {
  return supabase
    .from('mortgage_details')
    .select(
      'id, property_id, lender_name, original_loan_amount, current_balance, interest_rate, monthly_payment, loan_start_date, term_years',
    )
    .eq('property_id', propertyId)
    .maybeSingle()
}

export async function createMortgageDetails(
  accountId: string,
  propertyId: string,
  input: MortgageDetailsInput,
) {
  return supabase
    .from('mortgage_details')
    .insert({ ...input, account_id: accountId, property_id: propertyId })
    .select()
    .single()
}

export async function updateMortgageDetails(id: string, input: MortgageDetailsInput) {
  return supabase.from('mortgage_details').update(input).eq('id', id).select().single()
}

export interface PortfolioMortgageRow {
  property_id: string
  current_balance: string
  property: { name: string; market_value: string | null } | null
}

export async function listPortfolioMortgages(accountId: string) {
  return supabase
    .from('mortgage_details')
    .select('property_id, current_balance, property:properties(name, market_value)')
    .eq('account_id', accountId)
    .returns<PortfolioMortgageRow[]>()
}
