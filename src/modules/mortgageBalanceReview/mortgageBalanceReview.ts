import type { ReviewCauseRow } from './mortgageBalanceReviewQueries'

export interface BalanceReviewGroup {
  kind: 'principal' | 'escrow'
  currentValue: string | null
  reasons: string[]
}

export interface LoanReview {
  loanId: string
  propertyId: string
  label: string
  balanceVersion: number
  balances: BalanceReviewGroup[]
}

const REASON: Record<ReviewCauseRow['cause'], string> = {
  skipped_reset_after_entry:
    'An entry was voided after this balance had been reset, so the balance was not changed. The reset may or may not already include it.',
  skipped_unlinked_legacy: 'An earlier entry, not linked to a loan, was voided. The balance was not changed.',
  refused_negative_escrow: 'A deposit could not be voided: a later disbursement used it.',
  refused_over_original: 'A payment could not be voided: the balance would exceed the original loan amount.',
}

// One review per loan; principal and escrow are listed (and resolved) separately.
export function groupReviewCauses(rows: ReviewCauseRow[]): LoanReview[] {
  const byLoan = new Map<string, LoanReview>()
  for (const row of rows) {
    if (!row.loan) continue
    let review = byLoan.get(row.loan.id)
    if (!review) {
      const address = row.property?.address ?? 'Property'
      review = {
        loanId: row.loan.id,
        propertyId: row.property?.id ?? '',
        label: row.loan.lender_name ? `${address} · ${row.loan.lender_name}` : address,
        balanceVersion: row.loan.balance_version,
        balances: [],
      }
      byLoan.set(row.loan.id, review)
    }
    let group = review.balances.find((b) => b.kind === row.balance_kind)
    if (!group) {
      group = {
        kind: row.balance_kind,
        currentValue: row.balance_kind === 'principal' ? row.loan.current_balance : row.loan.escrow_balance,
        reasons: [],
      }
      review.balances.push(group)
    }
    group.reasons.push(REASON[row.cause])
  }
  for (const review of byLoan.values()) review.balances.sort((a, b) => (a.kind === 'principal' ? -1 : b.kind === 'principal' ? 1 : 0))
  return [...byLoan.values()]
}
