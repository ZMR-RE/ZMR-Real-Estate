import { describe, expect, it } from 'vitest'
import { mortgageCurrencyFormatter } from './mortgagePayoffFormat'

// Regression coverage for the bug this correction fixed: every Mortgage-tab
// money display used to run its own Intl.NumberFormat config, and they'd
// drifted — MortgagePropertySummary rounded to whole dollars
// (maximumFractionDigits: 0), while MortgagePaymentList/EscrowTransactionList
// set maximumFractionDigits without minimumFractionDigits, which lets the
// formatter trim trailing zeros instead of padding to them. All four
// display components now share this one formatter, so these cases cover
// every one of them at once.
describe('mortgageCurrencyFormatter', () => {
  it('pads a whole-dollar amount to two decimals, never rounding it away', () => {
    expect(mortgageCurrencyFormatter.format(50)).toBe('$50.00')
    expect(mortgageCurrencyFormatter.format(1235)).toBe('$1,235.00')
  })

  it('pads a single-decimal amount out to two digits', () => {
    expect(mortgageCurrencyFormatter.format(50.5)).toBe('$50.50')
  })

  it('keeps an amount that already has two decimals unchanged', () => {
    expect(mortgageCurrencyFormatter.format(1234.5)).toBe('$1,234.50')
    expect(mortgageCurrencyFormatter.format(99.99)).toBe('$99.99')
  })

  it('rounds (does not truncate) a third-decimal value to two places', () => {
    expect(mortgageCurrencyFormatter.format(12.345)).toBe('$12.35')
    expect(mortgageCurrencyFormatter.format(12.344)).toBe('$12.34')
  })

  it('formats zero as $0.00, not blank or "$0"', () => {
    expect(mortgageCurrencyFormatter.format(0)).toBe('$0.00')
  })
})
