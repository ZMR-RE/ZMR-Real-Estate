import { readMortgageHistory } from './readMortgageHistory'
import { supabase } from '../../shared/supabaseClient'
import type { EscrowTransactionType, MortgageEscrowTransactionInput, MortgagePaymentInput } from './mortgagePayoffQueries'

// Option B (H2, 20261005100000): history-only entries — real past payments / escrow items that the loan's confirmed
// opening (statement) balance already includes. Separate tables; they never move a balance. The database enforces
// eligibility (statement date set, entry on or before it, active loan) and the duplicate rule.

export interface HistoryPayment {
  mortgage_id?: string | null
  id: string
  property_id: string
  payment_date: string
  amount: string
  principal_amount: string
  interest_amount: string
  declared_as_of: string
  voided: boolean
}

export interface HistoryEscrow {
  id: string
  property_id: string
  transaction_date: string
  transaction_type: EscrowTransactionType
  amount: string
  description: string | null
  declared_as_of: string
  voided: boolean
}

export async function listHistoryPayments(propertyId: string) {
  return readMortgageHistory((from, to) => supabase
    .from('mortgage_history_payments')
    .select('id, property_id, mortgage_id, payment_date, amount, principal_amount, interest_amount, declared_as_of, voided', { count: 'exact' })
    .eq('property_id', propertyId)
    .order('payment_date', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to)
    .returns<HistoryPayment[]>()
  )
}

export async function listHistoryEscrow(propertyId: string) {
  return readMortgageHistory((from, to) => supabase
    .from('mortgage_history_escrow')
    .select('id, property_id, transaction_date, transaction_type, amount, description, declared_as_of, voided', { count: 'exact' })
    .eq('property_id', propertyId)
    .order('transaction_date', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to)
    .returns<HistoryEscrow[]>()
  )
}

// ackMatches: the number of identical entries the user was shown and confirmed ("Record anyway"); null otherwise.
export async function createHistoryPayment(accountId: string, propertyId: string, input: MortgagePaymentInput, ackMatches: number | null) {
  return supabase
    .from('mortgage_history_payments')
    .insert({ ...input, account_id: accountId, property_id: propertyId, ...(ackMatches ? { duplicate_ack_matches: ackMatches } : {}) })
    .select()
    .single()
}

export async function createHistoryEscrow(accountId: string, propertyId: string, input: MortgageEscrowTransactionInput, ackMatches: number | null) {
  return supabase
    .from('mortgage_history_escrow')
    .insert({ ...input, account_id: accountId, property_id: propertyId, ...(ackMatches ? { duplicate_ack_matches: ackMatches } : {}) })
    .select()
    .single()
}

// A history void changes no balance; the database only allows the void fields to change, once.
export async function voidHistoryEntry(kind: 'payment' | 'escrow', id: string, reason: string | null = null) {
  return supabase
    .from(kind === 'payment' ? 'mortgage_history_payments' : 'mortgage_history_escrow')
    .update({ voided: true, void_reason: reason })
    .eq('id', id)
    .select('id')
    .single()
}
