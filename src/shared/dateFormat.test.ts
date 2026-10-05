import { describe, expect, it } from 'vitest'
import { formatDateOnly, formatDateOnlyShort } from './dateFormat'

describe('date-only formatting', () => {
  it('reads the YYYY-MM-DD string directly, with no timezone shift', () => {
    expect(formatDateOnly('2026-01-01')).toBe('January 1, 2026')
    expect(formatDateOnly('2026-12-31')).toBe('December 31, 2026')
  })

  it('has a three-letter-month form for table cells', () => {
    expect(formatDateOnlyShort('2026-10-15')).toBe('Oct 15, 2026')
    expect(formatDateOnlyShort('2026-09-30')).toBe('Sep 30, 2026')
    expect(formatDateOnlyShort('2026-05-01')).toBe('May 1, 2026')
  })
})
