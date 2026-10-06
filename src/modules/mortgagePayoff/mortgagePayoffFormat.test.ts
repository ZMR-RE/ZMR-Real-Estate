import { describe, expect, it } from 'vitest'
import { formatCurrencyInputOnBlur, mortgageCurrencyFormatter } from './mortgagePayoffFormat'

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

// Regression coverage for the owner-approved follow-up: mortgage currency
// INPUTS (not just read-only displays) show exactly two decimals once
// editing finishes (onBlur), without reformatting on every keystroke —
// that's the input's own onChange, untouched by this function — and
// without ever turning a genuinely blank field into "0.00".
describe('formatCurrencyInputOnBlur', () => {
  it('pads a whole-number string to two decimals', () => {
    expect(formatCurrencyInputOnBlur('200000')).toBe('200000.00')
  })

  it('pads a one-decimal string to two decimals', () => {
    expect(formatCurrencyInputOnBlur('195000.5')).toBe('195000.50')
  })

  it('formats a literal zero as "0.00", distinct from blank', () => {
    expect(formatCurrencyInputOnBlur('0')).toBe('0.00')
  })

  it('leaves an already-two-decimal string unchanged in value', () => {
    expect(formatCurrencyInputOnBlur('1264.14')).toBe('1264.14')
  })

  it('preserves excess precision so validation can reject it', () => {
    expect(formatCurrencyInputOnBlur('12.345')).toBe('12.345')
  })

  // PostgREST returns a `numeric` column as a bare JSON number, not a
  // quoted string, despite MortgageDetails' own TS type saying `string` —
  // confirmed directly from the network response this session
  // ("original_loan_amount":200000.00, parsed to the JS number 200000,
  // decimals already gone). This is exactly the "on load" case: an
  // existing record's raw value reaching this function is a number.
  it('formats a raw number (as PostgREST actually returns a numeric column), not just a string', () => {
    expect(formatCurrencyInputOnBlur(200000)).toBe('200000.00')
    expect(formatCurrencyInputOnBlur(195000.5)).toBe('195000.50')
    expect(formatCurrencyInputOnBlur(0)).toBe('0.00')
  })

  it('never coerces a blank field to "0.00" — blank stays blank', () => {
    expect(formatCurrencyInputOnBlur('')).toBe('')
    expect(formatCurrencyInputOnBlur('   ')).toBe('')
  })

  it('leaves unparseable text unchanged for the input\'s own validation to catch', () => {
    expect(formatCurrencyInputOnBlur('abc')).toBe('abc')
  })
})
