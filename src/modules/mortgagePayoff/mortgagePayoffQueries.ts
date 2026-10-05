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
  // Mortgage correction (T1, isolated branch) — owner-approved exception
  // to the app's otherwise-standard "last four digits only" convention:
  // the FULL loan number, stored as free text (leading zeros and letters
  // both occur in real loan numbers and would be lost by a numeric
  // column). Optional, never backfilled for an existing mortgage.
  loan_number: string | null
  // Pick-list-governed (8.1) — see pickListsQueries.ts's PickListName
  // 'loan_type' and its 8 owner-approved seeded starting values.
  // Optional, never backfilled for an existing mortgage.
  loan_type: string | null
  // Balance integrity (20261004100000): one version counter per balance, bumped by every change to that balance.
  // A balance update quotes the version of each balance it changes, so a stale form can't overwrite a newer figure
  // and an escrow change never makes a principal-only update stale.
  principal_version: number
  escrow_version: number
  // Statement dates of the two balances (NULL = unknown). Read-only here; they decide where history-only entries are
  // allowed (option B). Optional so callers building a loan record client-side needn't set them.
  principal_as_of?: string | null
  escrow_as_of?: string | null
}

export type MortgageDetailsInput = Omit<MortgageDetails, 'id' | 'property_id' | 'principal_version' | 'escrow_version' | 'principal_as_of' | 'escrow_as_of'> & {
  // Not a column: the statement date the balance figures come from (optional). Stored as the balances' as-of date on
  // create, or sent with a balance update; never defaulted.
  balance_statement_date?: string | null
}

// voided = false — a voided mortgage is never "the" active mortgage for a
// property (roadmap 9.20); the property_id unique index was relaxed to a
// partial one (active rows only) specifically so this can return null and
// let the caller re-enter a fresh mortgage without hitting a conflict.
export async function getMortgageDetails(propertyId: string) {
  return supabase
    .from('mortgage_details')
    .select(
      'id, property_id, lender_name, original_loan_amount, current_balance, interest_rate, monthly_payment, loan_start_date, term_years, escrow_balance, loan_number, loan_type, principal_version, escrow_version, principal_as_of, escrow_as_of',
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
  const { balance_statement_date, ...columns } = input
  const asOf = balance_statement_date || null
  return supabase
    .from('mortgage_details')
    .insert({
      ...columns,
      principal_as_of: asOf,
      escrow_as_of: columns.escrow_balance === null ? null : asOf,
      account_id: accountId,
      property_id: propertyId,
    })
    .select()
    .single()
}

// Loan details only. The balances are never sent here: the database refuses a balance change outside
// resetMortgageBalance (balance integrity, 20261004100000).
export async function updateMortgageDetails(
  id: string,
  details: Omit<MortgageDetailsInput, 'current_balance' | 'escrow_balance'>,
) {
  return supabase.from('mortgage_details').update(details).eq('id', id).select().single()
}

export interface BalanceResetRequest {
  mortgageId: string
  principal: number | null
  principalVersion: number | null
  escrow: number | null
  escrowVersion: number | null
  statementDate?: string | null
  // review causes the user was shown and is resolving with this update (never others)
  resolveCauseIds?: string[]
}

// Versioned balance update (a manual edit or a statement confirmation). Refused with ZM5M5 when a balance being
// updated changed since its version was read; a same-value update is a deliberate confirmation.
export async function resetMortgageBalance(req: BalanceResetRequest) {
  return supabase.rpc('reset_mortgage_balance', {
    p_mortgage_id: req.mortgageId,
    p_principal: req.principal,
    p_expected_principal_version: req.principalVersion,
    p_escrow: req.escrow,
    p_expected_escrow_version: req.escrowVersion,
    p_statement_date: req.statementDate ?? null,
    p_resolve_cause_ids: req.resolveCauseIds ?? [],
  })
}

// An earlier entry that was never linked to a loan was voided; nothing about the balance can be inferred, so the
// review is closed only by an explicit acknowledgement.
export async function acknowledgeMortgageReviewCause(causeId: string) {
  return supabase.rpc('acknowledge_mortgage_review_cause', { p_cause_id: causeId })
}

export interface VoidResult {
  outcome: string
  voided: boolean
}

// The only void path (roadmap 9.20 + balance integrity): the database decides whether the balance can be safely
// reversed, records the outcome, and opens an Action Queue balance review when it can't.
export async function voidMortgageActivity(kind: 'payment' | 'escrow', id: string) {
  const { data, error } = await supabase.rpc('void_mortgage_activity', { p_kind: kind, p_id: id })
  return { data: (data ?? null) as VoidResult | null, error }
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
  mortgage_id?: string | null
  id: string
  property_id: string
  payment_date: string
  amount: string
  principal_amount: string
  interest_amount: string
  voided: boolean
  void_outcome: string | null
}

export type MortgagePaymentInput = Omit<MortgagePayment, 'id' | 'property_id' | 'mortgage_id' | 'voided' | 'void_outcome'>

// Fetches voided rows too (not just active), same as
// listMortgageEscrowTransactions — the list stays the full history with
// voided entries visibly marked, rather than making them disappear
// entirely.
export async function listMortgagePayments(propertyId: string) {
  return supabase
    .from('mortgage_payments')
    .select('id, property_id, mortgage_id, payment_date, amount, principal_amount, interest_amount, voided, void_outcome')
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
  ackMatches: number | null = null, // duplicate rule (20261005100000): the identical-entry count the user confirmed
) {
  return supabase
    .from('mortgage_payments')
    .insert({ ...input, account_id: accountId, property_id: propertyId, ...(ackMatches ? { duplicate_ack_matches: ackMatches } : {}) })
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
  void_outcome: string | null
}

export type MortgageEscrowTransactionInput = Omit<MortgageEscrowTransaction, 'id' | 'property_id' | 'voided' | 'void_outcome'>

// Fetches voided rows too (not just active), same as financial_transactions'
// TransactionList — the list stays the full history with voided entries
// visibly marked, rather than making them disappear entirely.
export async function listMortgageEscrowTransactions(propertyId: string) {
  return supabase
    .from('mortgage_escrow_transactions')
    .select('id, property_id, transaction_date, transaction_type, amount, description, voided, void_outcome')
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
  ackMatches: number | null = null, // duplicate rule (20261005100000)
) {
  return supabase
    .from('mortgage_escrow_transactions')
    .insert({ ...input, account_id: accountId, property_id: propertyId, ...(ackMatches ? { duplicate_ack_matches: ackMatches } : {}) })
    .select()
    .single()
}


export interface PortfolioMortgageRow {
  property_id: string
  current_balance: string
  property: { name: string; address: string | null } | null
}

// market_value no longer lives on properties (roadmap 7.19 moved it to
// the property_value_logs history) — callers needing each property's
// latest market value fetch it separately via
// propertyValueHistoryQueries.listLatestValuesForAccount and merge by
// property_id, rather than this query embedding it.
export async function listPortfolioMortgages(accountId: string) {
  return supabase
    .from('mortgage_details')
    .select('property_id, current_balance, property:properties(name, address)')
    .eq('account_id', accountId)
    .eq('voided', false)
    .returns<PortfolioMortgageRow[]>()
}
