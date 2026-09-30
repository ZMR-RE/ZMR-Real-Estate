import { describe, expect, it } from 'vitest'
import { ruleFormFrom, ruleInputFrom, ruleSummary, validateRule } from './chargeRulesLogic'
import type { ChargeRuleRow } from './chargeRulesQueries'

const base = ruleFormFrom(null)
const row = (over: Partial<ChargeRuleRow>): ChargeRuleRow => ({
  id: 'r', lease_id: 'l', kind: 'fixed_recurring', description: 'Pest control', amount: 60, basis_total: 120, share_percent: 50,
  effective_from: '2027-01-01', effective_to: null, one_time_period: null, applied_invoice_id: null, status: 'active', notes: null, version: 1, tenancy_charge_statements: [], ...over,
})

describe('tenancy billing rules', () => {
  it('a fixed half-share keeps the full cost for clarity', () => {
    const v = { ...base, description: 'Pest control', amount: '60', basisTotal: '120', sharePercent: '50', effectiveFrom: '2027-01-01' }
    expect(validateRule(v)).toEqual([])
    expect(ruleInputFrom(v)).toMatchObject({ kind: 'fixed_recurring', amount: 60, basis_total: 120, share_percent: 50, one_time_period: null })
    expect(ruleSummary(row({}))).toBe('$60.00 monthly (50% of $120.00)')
  })

  it('a variable share never carries an amount (billed only from a statement)', () => {
    const v = { ...base, kind: 'variable_statement' as const, description: 'Gas', amount: '40', sharePercent: '50' }
    expect(validateRule(v)).toEqual([])
    expect(ruleInputFrom(v)).toMatchObject({ amount: null, basis_total: null, share_percent: 50 })
    expect(validateRule({ ...v, sharePercent: '' })).toContain('Enter the tenant’s share, 1–100%.')
  })

  it('a one-time credit is negative and billed in one month', () => {
    const v = { ...base, kind: 'one_time' as const, description: 'Filter credit', amount: '-25', oneTimeMonth: '2027-01', effectiveFrom: '2027-01-01' }
    expect(validateRule(v)).toEqual([])
    expect(ruleInputFrom(v)).toMatchObject({ amount: -25, one_time_period: '2027-01-01', effective_from: null, share_percent: null })
    expect(validateRule({ ...v, oneTimeMonth: '' })).toContain('Choose the month it’s billed in.')
    expect(ruleSummary(row({ kind: 'one_time', amount: -25, one_time_period: '2027-01-01', basis_total: null, share_percent: null }))).toBe('-$25.00 in January 2027 (credit)')
  })

  it('refuses incomplete or inconsistent rules like the database', () => {
    expect(validateRule(base)).toEqual(expect.arrayContaining(['Describe the charge (it prints on the invoice).', 'Enter the amount charged each month.']))
    expect(validateRule({ ...base, description: 'x', amount: '60', basisTotal: '120' })).toContain('For “half of a cost”, enter both the full cost and the share — or neither.')
    expect(validateRule({ ...base, description: 'x', amount: '5', effectiveFrom: '2027-02-01', effectiveTo: '2027-01-01' })).toContain('The rule can’t end before it starts.')
  })
})
