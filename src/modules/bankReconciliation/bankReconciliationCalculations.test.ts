import { describe, expect, it } from 'vitest'
import { reconciliationShortfall } from './bankReconciliationCalculations'

describe('reconciliation save reports entries it could not match', () => {
  it('nothing to report when every selected entry was matched', () => {
    expect(reconciliationShortfall(['a', 'b'], ['b', 'a'])).toBeNull()
  })

  it('reports one skipped entry (e.g. voided in the meantime)', () => {
    expect(reconciliationShortfall(['a', 'b'], ['a'])).toMatch(/^1 selected transaction was not marked as matched/)
  })

  it('reports several skipped entries', () => {
    expect(reconciliationShortfall(['a', 'b', 'c'], [])).toMatch(/^3 selected transactions were not marked as matched/)
  })
})
