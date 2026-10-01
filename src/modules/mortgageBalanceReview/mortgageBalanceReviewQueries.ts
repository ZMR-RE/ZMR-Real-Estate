import { supabase } from '../../shared/supabaseClient'

// Open causes behind the Action Queue "Mortgage balance review" item (balance integrity, 20261004100000). Rows are
// written only by the database's void logic; the app reads them and resolves them by confirming or resetting a balance.
export interface ReviewCauseRow {
  id: string
  balance_kind: 'principal' | 'escrow'
  cause: 'skipped_reset_after_entry' | 'skipped_unlinked_legacy' | 'refused_negative_escrow' | 'refused_over_original'
  source_kind: 'payment' | 'escrow'
  created_at: string
  property: { id: string; address: string | null } | null
  loan: {
    id: string
    lender_name: string | null
    current_balance: string
    escrow_balance: string | null
    balance_version: number
  } | null
}

export async function listOpenReviewCauses(accountId: string) {
  return supabase
    .from('mortgage_balance_review_causes')
    .select(
      'id, balance_kind, cause, source_kind, created_at, property:properties(id, address), loan:mortgage_details!review_mortgage_id(id, lender_name, current_balance, escrow_balance, balance_version)',
    )
    .eq('account_id', accountId)
    .is('resolved_at', null)
    .order('created_at', { ascending: true })
    .returns<ReviewCauseRow[]>()
}
