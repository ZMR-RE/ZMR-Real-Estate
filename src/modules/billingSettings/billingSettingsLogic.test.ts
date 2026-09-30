import { describe, expect, it } from 'vitest'
import { dueDayLabel, normalizeInvoiceCode, ordinal, previewInvoiceNumber, termsFormFrom, termsInputFrom, validateEntityInvoicing, validateTerms } from './billingSettingsLogic'

describe('billing settings logic', () => {
  it('labels due days, flagging month-end days', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(22)).toBe('22nd')
    expect(dueDayLabel(5)).toBe('5th of each month')
    expect(dueDayLabel(31)).toMatch(/last day in shorter months/)
  })

  it('requires a due day and ordered dates', () => {
    const v = termsFormFrom(null)
    expect(validateTerms(v)).toContain('Choose the rent due day.')
    expect(validateTerms({ ...v, dueDay: '1', effectiveFrom: '2026-10-01', effectiveTo: '2026-09-01' })).toContain('Billing can’t end before it starts.')
    expect(validateTerms({ ...v, dueDay: '1' })).toEqual([])
  })

  it('round-trips terms without inventing values', () => {
    const input = termsInputFrom({ ...termsFormFrom(null), dueDay: '31', prorateRule: 'daily' })
    expect(input).toEqual({ due_day: 31, effective_from: null, effective_to: null, prorate_rule: 'daily', prorate_notes: null })
  })

  it('validates entity invoicing like the database', () => {
    expect(normalizeInvoiceCode(' srp ')).toBe('SRP')
    expect(validateEntityInvoicing({ invoice_code: 'BAD CODE', billing_reply_to_email: null, payment_instructions: null }, '', true)).toHaveLength(1)
    expect(validateEntityInvoicing({ invoice_code: 'A', billing_reply_to_email: 'x', payment_instructions: null }, '', true)).toContain('Reply-to email doesn’t look valid.')
    expect(validateEntityInvoicing({ invoice_code: 'A', billing_reply_to_email: null, payment_instructions: null }, '0', true)).toHaveLength(1)
    expect(validateEntityInvoicing({ invoice_code: 'A', billing_reply_to_email: null, payment_instructions: null }, '0', false)).toEqual([])
  })

  it('previews six-digit numbers without truncating', () => {
    expect(previewInvoiceNumber('A', 1)).toBe('A-INV-000001')
    expect(previewInvoiceNumber('A', 1234567)).toBe('A-INV-1234567')
    expect(previewInvoiceNumber(null, 1)).toBeNull()
  })
})
