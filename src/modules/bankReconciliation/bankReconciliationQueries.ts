import { supabase } from '../../shared/supabaseClient'

// The only write this module needs: flipping the existing
// financial_transactions.statement_reconciled flag (added for exactly this
// purpose — see 20260904190005_financial_transactions.sql) once a set of
// transactions has been matched against a bank/CC statement. Reading
// transactions themselves is handled by financials/financialsQueries.ts's
// listTransactions — no need to duplicate that query here.
//
// Voided entries are never matched (the database refuses it too, ZM092):
// the update skips them, and the caller compares how many rows actually
// changed with how many it asked for, so a skipped entry is reported
// rather than silently left out.
export async function markTransactionsReconciled(accountId: string, transactionIds: string[]) {
  return supabase
    .from('financial_transactions')
    .update({ statement_reconciled: true })
    .eq('account_id', accountId)
    .eq('voided', false)
    .in('id', transactionIds)
    .select('id')
}

// Read-only check of specific saved records (used to verify a save whose
// outcome could not be confirmed), independent of the list on screen.
export async function listReconciliationState(accountId: string, transactionIds: string[]) {
  return supabase
    .from('financial_transactions')
    .select('id, statement_reconciled, voided')
    .eq('account_id', accountId)
    .in('id', transactionIds)
}
