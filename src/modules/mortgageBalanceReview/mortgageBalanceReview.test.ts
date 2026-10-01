import { describe, expect, it } from 'vitest'
import { describeCause, groupReviewCauses } from './mortgageBalanceReview'
import type { ReviewCauseRow } from './mortgageBalanceReviewQueries'

const loan = { id: 'L1', lender_name: 'ZMR-TEST Bank', current_balance: '900.00', escrow_balance: '10.00', principal_version: 7, escrow_version: 3 }
const payCtx = { entry_date: '2026-09-01', entry_type: 'payment', principal: '257.00', balance_updated_at: '2026-10-01T02:08:53Z' }
let n = 0
const row = (over: Partial<ReviewCauseRow>): ReviewCauseRow => ({
  id: `c${++n}`,
  balance_kind: 'principal',
  cause: 'skipped_reset_after_entry',
  source_kind: 'payment',
  context: payCtx,
  created_at: '2026-10-01T00:00:00Z',
  property: { id: 'P1', address: '1 ZMR-TEST St' },
  loan,
  ...over,
})

describe('groupReviewCauses', () => {
  it('one review per loan; each balance carries exactly its own displayed cause ids and version', () => {
    const reviews = groupReviewCauses([
      row({ id: 'e1', balance_kind: 'escrow', cause: 'refused_negative_escrow', source_kind: 'escrow', context: { entry_type: 'deposit', amount: '40.00', entry_date: '2026-09-02' } }),
      row({ id: 'p1' }),
      row({ id: 'p2', cause: 'possibly_covered_by_statement' }),
    ])
    expect(reviews).toHaveLength(1)
    expect(reviews[0].balances.map((b) => [b.kind, b.version, b.causes.map((c) => c.id)])).toEqual([
      ['principal', 7, ['p1', 'p2']],
      ['escrow', 3, ['e1']],
    ])
  })
  it('keeps unlinked earlier entries out of balance confirmation', () => {
    const [review] = groupReviewCauses([row({ id: 'g1', cause: 'skipped_unlinked_legacy' })])
    expect(review.balances).toHaveLength(0)
    expect(review.legacy.map((l) => l.id)).toEqual(['g1'])
  })
})

describe('describeCause (context needed to decide safely)', () => {
  it('names the entry and when the balance was updated', () => {
    const t = describeCause(row({})).text
    expect(t).toMatch(/Payment dated 2026-09-01 \(principal 257\.00\)/)
    expect(t).toMatch(/updated 2026-10-01, no statement date recorded/)
  })
  it('shows a recorded statement date', () => {
    expect(describeCause(row({ cause: 'possibly_covered_by_statement', context: { ...payCtx, statement_date: '2026-09-30' } })).text).toMatch(/statement date 2026-09-30/)
  })
  it('says a refused entry is still active and what to do next', () => {
    const neg = describeCause(row({ cause: 'refused_negative_escrow', context: { entry_type: 'deposit', amount: '40.00', entry_date: '2026-09-02' } }))
    expect(neg.stillActive).toBe(true)
    expect(neg.text).toMatch(/Not voided: Escrow deposit dated 2026-09-02 \(40\.00\) is still active.*void that disbursement first/)
    expect(describeCause(row({ cause: 'refused_over_original' })).text).toMatch(/still active.*original loan amount/)
  })
})
