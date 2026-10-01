import { supabase } from '../../shared/supabaseClient'

// Open causes behind the Action Queue "Mortgage balance review" item (balance integrity, 20261004100000). Rows are
// written only by the database's controlled functions, each with the context needed to decide it (entry and balance
// update); the app resolves them only through those functions — never a generic checkbox.
export type ReviewCause =
  | 'skipped_reset_after_entry'
  | 'skipped_unlinked_legacy'
  | 'refused_negative_escrow'
  | 'refused_over_original'
  | 'possibly_covered_by_statement'

export interface ReviewContext {
  entry_date?: string
  entry_type?: string
  amount?: string
  principal?: string
  entry_recorded_at?: string
  balance_updated_at?: string
  statement_date?: string
}

export interface ReviewCauseRow {
  id: string
  balance_kind: 'principal' | 'escrow'
  cause: ReviewCause
  source_kind: 'payment' | 'escrow'
  context: ReviewContext
  created_at: string
  property: { id: string; address: string | null } | null
  loan: {
    id: string
    lender_name: string | null
    current_balance: string
    escrow_balance: string | null
    principal_version: number
    escrow_version: number
  } | null
}

export async function listOpenReviewCauses(accountId: string) {
  return supabase
    .from('mortgage_balance_review_causes')
    .select(
      'id, balance_kind, cause, source_kind, context, created_at, property:properties(id, address), loan:mortgage_details!review_mortgage_id(id, lender_name, current_balance, escrow_balance, principal_version, escrow_version)',
    )
    .eq('account_id', accountId)
    .is('resolved_at', null)
    .order('created_at', { ascending: true })
    .returns<ReviewCauseRow[]>()
}
