import { describe, expect, it } from 'vitest'
import { groupReviewCauses } from './mortgageBalanceReview'
import type { ReviewCauseRow } from './mortgageBalanceReviewQueries'

const loan = { id: 'L1', lender_name: 'ZMR-TEST Bank', current_balance: '900.00', escrow_balance: '10.00', balance_version: 7 }
const row = (over: Partial<ReviewCauseRow>): ReviewCauseRow => ({
  id: Math.random().toString(),
  balance_kind: 'principal',
  cause: 'skipped_reset_after_entry',
  source_kind: 'payment',
  created_at: '2026-10-01T00:00:00Z',
  property: { id: 'P1', address: '1 ZMR-TEST St' },
  loan,
  ...over,
})

describe('groupReviewCauses', () => {
  it('makes one review per loan with principal and escrow kept separate', () => {
    const reviews = groupReviewCauses([
      row({ balance_kind: 'escrow', cause: 'refused_negative_escrow', source_kind: 'escrow' }),
      row({}),
      row({ cause: 'skipped_unlinked_legacy' }),
    ])
    expect(reviews).toHaveLength(1)
    expect(reviews[0].label).toBe('1 ZMR-TEST St · ZMR-TEST Bank')
    expect(reviews[0].balanceVersion).toBe(7)
    expect(reviews[0].balances.map((b) => [b.kind, b.currentValue, b.reasons.length])).toEqual([
      ['principal', '900.00', 2],
      ['escrow', '10.00', 1],
    ])
  })
  it('separates different loans', () => {
    expect(groupReviewCauses([row({}), row({ loan: { ...loan, id: 'L2' } })])).toHaveLength(2)
  })
})
