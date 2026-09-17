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
  // Escrow (roadmap 9.14) — held by the servicer for property tax and
  // insurance, tracked separately from principal/interest above so it
  // never gets folded into current_balance.
  escrow_balance: string | null
}

export type MortgageDetailsInput = Omit<MortgageDetails, 'id' | 'property_id'>

// voided = false — a voided mortgage is never "the" active mortgage for a
// property (roadmap 9.20); the property_id unique index was relaxed to a
// partial one (active rows only) specifically so this can return null and
// let the caller re-enter a fresh mortgage without hitting a conflict.
export async function getMortgageDetails(propertyId: string) {
  return supabase
    .from('mortgage_details')
    .select(
      'id, property_id, lender_name, original_loan_amount, current_balance, interest_rate, monthly_payment, loan_start_date, term_years, escrow_balance',
    )
    .eq('property_id', propertyId)
    .eq('voided', false)
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

// The only "removal" path for a mortgage record (roadmap 9.20) — never a
// hard DELETE. Leaves the row, its mortgage_payments/mortgage_escrow_transactions
// history, and any documents linked to it (documents.mortgage_id) fully
// intact; only getMortgageDetails/listPortfolioMortgages stop surfacing it
// as active.
export async function voidMortgageDetails(id: string) {
  return supabase
    .from('mortgage_details')
    .update({ voided: true, voided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

export interface MortgagePayment {
  id: string
  property_id: string
  payment_date: string
  amount: string
  principal_amount: string
  interest_amount: string
  voided: boolean
}

export type MortgagePaymentInput = Omit<MortgagePayment, 'id' | 'property_id' | 'voided'>

// Fetches voided rows too (not just active), same as
// listMortgageEscrowTransactions — the list stays the full history with
// voided entries visibly marked, rather than making them disappear
// entirely.
export async function listMortgagePayments(propertyId: string) {
  return supabase
    .from('mortgage_payments')
    .select('id, property_id, payment_date, amount, principal_amount, interest_amount, voided')
    .eq('property_id', propertyId)
    .order('payment_date', { ascending: false })
    .returns<MortgagePayment[]>()
}

// The current_balance reduction happens in the mortgage_payments_apply_to_balance
// trigger, not here — callers must re-fetch mortgage_details after this resolves.
export async function createMortgagePayment(
  accountId: string,
  propertyId: string,
  input: MortgagePaymentInput,
) {
  return supabase
    .from('mortgage_payments')
    .insert({ ...input, account_id: accountId, property_id: propertyId })
    .select()
    .single()
}

// The only "removal" path for a payment (matches mortgage_details/
// mortgage_escrow_transactions, roadmap 9.20) — never a hard DELETE. Does
// not reverse the payment's earlier effect on mortgage_details.current_balance
// (that trigger only ever runs on INSERT) — voiding corrects the record
// going forward, it isn't a balance-adjustment tool.
export async function voidMortgagePayment(id: string) {
  return supabase
    .from('mortgage_payments')
    .update({ voided: true, voided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

export type EscrowTransactionType = 'deposit' | 'disbursement'

export interface MortgageEscrowTransaction {
  id: string
  property_id: string
  transaction_date: string
  transaction_type: EscrowTransactionType
  amount: string
  description: string | null
  voided: boolean
}

export type MortgageEscrowTransactionInput = Omit<MortgageEscrowTransaction, 'id' | 'property_id' | 'voided'>

// Fetches voided rows too (not just active), same as financial_transactions'
// TransactionList — the list stays the full history with voided entries
// visibly marked, rather than making them disappear entirely.
export async function listMortgageEscrowTransactions(propertyId: string) {
  return supabase
    .from('mortgage_escrow_transactions')
    .select('id, property_id, transaction_date, transaction_type, amount, description, voided')
    .eq('property_id', propertyId)
    .order('transaction_date', { ascending: false })
    .returns<MortgageEscrowTransaction[]>()
}

// escrow_balance is updated by the apply_mortgage_escrow_transaction_to_balance
// trigger, not here — callers must re-fetch mortgage_details after this resolves.
export async function createMortgageEscrowTransaction(
  accountId: string,
  propertyId: string,
  input: MortgageEscrowTransactionInput,
) {
  return supabase
    .from('mortgage_escrow_transactions')
    .insert({ ...input, account_id: accountId, property_id: propertyId })
    .select()
    .single()
}

// The only "removal" path for an escrow transaction (roadmap 9.20) — never
// a hard DELETE. Note this does not reverse its earlier effect on
// mortgage_details.escrow_balance (that trigger only ever runs on INSERT,
// same as mortgage_payments/current_balance) — voiding corrects the record
// going forward, it isn't a balance-adjustment tool.
export async function voidMortgageEscrowTransaction(id: string) {
  return supabase
    .from('mortgage_escrow_transactions')
    .update({ voided: true, voided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

export interface PortfolioMortgageRow {
  property_id: string
  current_balance: string
  property: { name: string; address: string | null; market_value: string | null } | null
}

export async function listPortfolioMortgages(accountId: string) {
  return supabase
    .from('mortgage_details')
    .select('property_id, current_balance, property:properties(name, address, market_value)')
    .eq('account_id', accountId)
    .eq('voided', false)
    .returns<PortfolioMortgageRow[]>()
}
