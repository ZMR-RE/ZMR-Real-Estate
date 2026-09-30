import { describe, expect, it } from 'vitest'
import { issued } from './invoiceSampleFixtures'
import { buildPatch, editValuesFrom, nextMonth, patchIsMaterial, periodFromMonth, tenancyLabel, validateEdit } from './invoiceWorkflowLogic'

const draft = { ...issued, state: 'draft' as const, number: null, issuer_snapshot: null, recipient_snapshot: null, issued_at: null }

describe('invoice workflow logic', () => {
  it('labels a tenancy by address, unit and tenants', () => {
    expect(
      tenancyLabel({ id: 'l', property_id: 'p', start_date: '2026-01-01', end_date: null, unit: { unit_label: 'Unit 2' }, property: { address: '410 Example Street' }, lease_tenants: [{ is_billing_recipient: true, tenant: { id: 't1', name: 'Jordan Sample' } }, { is_billing_recipient: true, tenant: { id: 't2', name: 'Sam Sample' } }] }),
    ).toBe('410 Example Street — Unit 2 · Jordan Sample & Sam Sample')
  })

  it('turns a month into a first-of-month period', () => {
    expect(periodFromMonth('2026-11')).toBe('2026-11-01')
    expect(periodFromMonth('2026-13')).toBeNull()
    expect(nextMonth(new Date('2026-12-15T12:00:00Z'))).toBe('2027-01')
  })

  it('sends nothing when nothing changed', () => {
    expect(buildPatch(draft, editValuesFrom(draft))).toEqual({})
  })

  it('an internal-note-only edit is not material', () => {
    const patch = buildPatch(draft, { ...editValuesFrom(draft), internalNote: 'checked' })
    expect(patch).toEqual({ internal_note: 'checked' })
    expect(patchIsMaterial(patch)).toBe(false)
  })

  it('recipient, visible note and line changes are material', () => {
    const v = editValuesFrom(draft)
    expect(patchIsMaterial(buildPatch(draft, { ...v, recipientEmail: 'new@example.com' }))).toBe(true)
    expect(patchIsMaterial(buildPatch(draft, { ...v, visibleNote: 'Changed' }))).toBe(true)
    const withCharge = buildPatch(draft, { ...v, lines: [...v.lines, { line_kind: 'charge', description: 'Parking', amount: '75' }] })
    expect(withCharge.lines).toHaveLength(3)
    expect(patchIsMaterial(withCharge)).toBe(true)
  })

  it('validates lines, signs and email', () => {
    const v = editValuesFrom(draft)
    expect(validateEdit(v)).toEqual([])
    expect(validateEdit({ ...v, lines: [] })).toContain('Add at least one line.')
    expect(validateEdit({ ...v, lines: [{ line_kind: 'credit', description: 'x', amount: '5' }] })[0]).toMatch(/credits are negative/)
    expect(validateEdit({ ...v, lines: [{ line_kind: 'credit', description: 'x', amount: '-5' }] })).toContain('Credits can’t exceed the charges.')
    expect(validateEdit({ ...v, recipientEmail: 'nope' })).toContain('Recipient email doesn’t look valid.')
  })
})
