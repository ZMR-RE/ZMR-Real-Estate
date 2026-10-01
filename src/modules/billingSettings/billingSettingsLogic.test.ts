import { describe, expect, it } from 'vitest'
import { dueDayLabel, effectivePaymentInstructions, issuerKindLabel, issuerOptionLabel, issuersNamed, normalizeInvoiceCode, ordinal, previewInvoiceNumber, termsFormFrom, termsInputFrom, validateEntityInvoicing, validateTerms } from './billingSettingsLogic'

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
    expect(input).toEqual({ due_day: 31, effective_from: null, effective_to: null, prorate_rule: 'daily', prorate_notes: null, continues_lease_id: null })
  })

  it('validates entity invoicing like the database', () => {
    expect(normalizeInvoiceCode(' srp ')).toBe('SRP')
    expect(validateEntityInvoicing({ invoice_code: 'BAD CODE' }, '', true)).toHaveLength(1)
    expect(validateEntityInvoicing({ invoice_code: 'A' }, '0', true)).toHaveLength(1)
    expect(validateEntityInvoicing({ invoice_code: 'A' }, '0', false)).toEqual([])
  })

  it('labels where a property’s payment instructions come from', () => {
    expect(effectivePaymentInstructions('Site office', 'Zelle', 'Example Holdings')).toEqual({ text: 'Site office', source: expect.stringMatching(/own instructions/) })
    expect(effectivePaymentInstructions('  ', 'Zelle', 'Example Holdings')).toEqual({ text: 'Zelle', source: expect.stringMatching(/Inherited from Example Holdings’s default/) })
    expect(effectivePaymentInstructions(null, null, 'Example Holdings')).toEqual({ text: null, source: null })
  })

  it('previews six-digit numbers without truncating', () => {
    expect(previewInvoiceNumber('A', 1)).toBe('A-INV-000001')
    expect(previewInvoiceNumber('A', 1234567)).toBe('A-INV-1234567')
    expect(previewInvoiceNumber(null, 1)).toBeNull()
  })
})

describe('invoice issuer (person or business)', () => {
  it('a property’s own instructions show with no issuer chosen, labelled as its own', () => {
    expect(effectivePaymentInstructions('Cash at the site office', null, null)).toEqual({ text: 'Cash at the site office', source: 'This property’s own instructions' })
    expect(effectivePaymentInstructions('Cash at the site office', 'Zelle', 'Example Holdings').source).toMatch(/overrides the issuer’s default/)
  })

  it('says person or business only when the owner record says so — never guessed from the name', () => {
    expect(issuerKindLabel('individual')).toBe('Person')
    expect(issuerKindLabel('entity')).toBe('Business')
    expect(issuerKindLabel(null)).toBeNull()
    expect(issuerOptionLabel({ name: 'Riley Example', display_name: null, invoice_code: 'RE', owner_kind: 'individual' })).toBe('Riley Example — person (RE)')
    expect(issuerOptionLabel({ name: 'Example Holdings LLC', display_name: 'Example Holdings', invoice_code: null, owner_kind: 'entity' })).toBe('Example Holdings — business')
    expect(issuerOptionLabel({ name: 'Sample Road Properties LLC', display_name: null, invoice_code: 'SRP', owner_kind: null })).toBe('Sample Road Properties LLC (SRP)')
  })
})

describe('+ Add person: same-name records are offered, not forced', () => {
  const records = [
    { id: 'p1', name: 'Riley Example', display_name: null },
    { id: 'b1', name: 'Example Holdings LLC', display_name: 'Example Holdings' },
  ]
  it('finds records with the same name or display name, ignoring case and spacing', () => {
    expect(issuersNamed(records, '  riley   example ').map((r) => r.id)).toEqual(['p1'])
    expect(issuersNamed(records, 'example holdings').map((r) => r.id)).toEqual(['b1'])
    expect(issuersNamed(records, 'Riley Examples')).toEqual([])
    expect(issuersNamed(records, '  ')).toEqual([])
  })
})
