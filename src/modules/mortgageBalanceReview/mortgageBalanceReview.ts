import type { ReviewCauseRow, ReviewContext } from './mortgageBalanceReviewQueries'

export interface CauseLine {
  id: string
  text: string
  stillActive: boolean
}

export interface BalanceToConfirm {
  kind: 'principal' | 'escrow'
  currentValue: string | null
  version: number
  causes: CauseLine[]
}

export interface LoanReview {
  loanId: string
  propertyId: string
  label: string
  balances: BalanceToConfirm[]
  legacy: CauseLine[]
}

const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : 'an unknown date')

// "Payment dated 2026-09-01 (principal 257.00)" / "Escrow deposit dated … (40.00)"
export function describeEntry(c: ReviewContext): string {
  const what = c.entry_type === 'payment' ? 'Payment' : c.entry_type === 'disbursement' ? 'Escrow disbursement' : 'Escrow deposit'
  const amount = c.entry_type === 'payment' ? `principal ${c.principal ?? '?'}` : (c.amount ?? '?')
  return `${what} dated ${day(c.entry_date)} (${amount})`
}

function balanceUpdate(c: ReviewContext): string {
  const when = `updated ${day(c.balance_updated_at)}`
  return c.statement_date ? `${when}, statement date ${c.statement_date}` : `${when}, no statement date recorded`
}

export function describeCause(row: ReviewCauseRow): CauseLine {
  const entry = describeEntry(row.context)
  switch (row.cause) {
    case 'possibly_covered_by_statement':
      return {
        id: row.id,
        stillActive: true,
        text: `${entry} was recorded for a period the balance may already include (balance ${balanceUpdate(row.context)}). It was applied, so check the balance isn't counting it twice.`,
      }
    case 'skipped_reset_after_entry':
      return {
        id: row.id,
        stillActive: false,
        text: `${entry} was voided after the balance was ${balanceUpdate(row.context)}, so the balance was not changed. That update may or may not include it.`,
      }
    case 'refused_negative_escrow':
      return {
        id: row.id,
        stillActive: true,
        text: `Not voided: ${entry} is still active. A later disbursement used this money. To remove it, void that disbursement first; or update escrow from your statement.`,
      }
    case 'refused_over_original':
      return {
        id: row.id,
        stillActive: true,
        text: `Not voided: ${entry} is still active, because removing it would raise the balance above the original loan amount. Check the balance against your statement.`,
      }
    case 'skipped_unlinked_legacy':
      return {
        id: row.id,
        stillActive: false,
        text: `${entry}, an earlier entry not linked to a loan, was voided. The ${row.balance_kind} balance was not changed.`,
      }
  }
}

// One review per loan; each balance carries exactly the cause ids shown (resolved only together with them).
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
        balances: [],
        legacy: [],
      }
      byLoan.set(row.loan.id, review)
    }
    const line = describeCause(row)
    if (row.cause === 'skipped_unlinked_legacy') {
      review.legacy.push(line)
      continue
    }
    let group = review.balances.find((b) => b.kind === row.balance_kind)
    if (!group) {
      group = {
        kind: row.balance_kind,
        currentValue: row.balance_kind === 'principal' ? row.loan.current_balance : row.loan.escrow_balance,
        version: row.balance_kind === 'principal' ? row.loan.principal_version : row.loan.escrow_version,
        causes: [],
      }
      review.balances.push(group)
    }
    group.causes.push(line)
  }
  for (const review of byLoan.values()) review.balances.sort((a) => (a.kind === 'principal' ? -1 : 1))
  return [...byLoan.values()]
}
