import { describe, expect, it } from 'vitest'
import { fieldLabel, formatFieldValue, HIDDEN_AUDIT_FIELDS, RECORD_LABELS } from './auditLogFormatting'

describe('audit trail for mortgage activity (balance integrity)', () => {
  it('labels the newly audited records and fields', () => {
    expect(RECORD_LABELS.mortgage_payments).toBe('Mortgage payment')
    expect(RECORD_LABELS.mortgage_escrow_transactions).toBe('Escrow entry')
    expect(fieldLabel('void_outcome')).toBe('Void result')
    expect(fieldLabel('principal_amount')).toBe('Principal')
  })
  it('explains a void result and formats activity amounts as money', () => {
    expect(formatFieldValue('void_outcome', 'skipped_reset_after_entry')).toMatch(/not changed/)
    expect(formatFieldValue('principal_amount', '257')).toBe('$257.00')
  })
  it('hides internal counters but not user-facing fields', () => {
    expect(HIDDEN_AUDIT_FIELDS.has('principal_version')).toBe(true)
    expect(HIDDEN_AUDIT_FIELDS.has('current_balance')).toBe(false)
  })
})
