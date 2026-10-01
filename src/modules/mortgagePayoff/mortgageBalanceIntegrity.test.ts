import { describe, expect, it } from 'vitest'
import { planMortgageSave, voidRefusalMessage, voidedRowNote } from './mortgageBalanceIntegrity'
import type { MortgageDetails } from './mortgagePayoffQueries'

const loaded: MortgageDetails = {
  id: 'm1', property_id: 'p1', lender_name: 'ZMR-TEST Bank', original_loan_amount: '85000.00', current_balance: '42952.07',
  interest_rate: '3.625', monthly_payment: '387.64', loan_start_date: '2020-06-01', term_years: 30, escrow_balance: '0.00',
  loan_number: null, loan_type: null, balance_version: 4,
}
const input = { ...loaded, current_balance: '42952.07', escrow_balance: '0.00' }

describe('planMortgageSave', () => {
  it('never sends balances with ordinary detail edits', () => {
    const plan = planMortgageSave(loaded, { ...input, lender_name: 'Renamed' })
    expect(plan.reset).toBeNull()
    expect(plan.details).not.toHaveProperty('current_balance')
    expect(plan.details).not.toHaveProperty('escrow_balance')
    expect(plan.details.lender_name).toBe('Renamed')
  })
  it('treats a formatted but equal value as unchanged (no reset)', () => {
    expect(planMortgageSave(loaded, { ...input, current_balance: '42952.070' }).reset).toBeNull()
  })
  it('resets only the balance the user changed', () => {
    expect(planMortgageSave(loaded, { ...input, current_balance: '42500.00' }).reset).toEqual({ principal: 42500, escrow: null })
    expect(planMortgageSave(loaded, { ...input, escrow_balance: '120.00' }).reset).toEqual({ principal: null, escrow: 120 })
  })
  it('refuses clearing an existing escrow balance to blank (blank is not zero)', () => {
    expect(planMortgageSave(loaded, { ...input, escrow_balance: null }).error).toMatch(/enter 0.00/)
  })
  it('allows a first escrow amount on a loan that had none', () => {
    expect(planMortgageSave({ ...loaded, escrow_balance: null }, { ...input, escrow_balance: '50.00' }).reset).toEqual({ principal: null, escrow: 50 })
  })
})

describe('void outcome messages', () => {
  it('explains refusals and promises the review item', () => {
    expect(voidRefusalMessage('refused_negative_escrow')).toMatch(/Not voided.*Action Queue/)
    expect(voidRefusalMessage('refused_over_original')).toMatch(/Not voided.*original loan amount.*Action Queue/)
    expect(voidRefusalMessage('reversed')).toBeNull()
  })
  it('notes voids that did not change the balance, and nothing for a normal reversal', () => {
    expect(voidedRowNote('skipped_reset_after_entry')).toMatch(/reset after this entry/)
    expect(voidedRowNote('skipped_loan_inactive')).toMatch(/inactive mortgage record/)
    expect(voidedRowNote('skipped_unlinked_legacy')).toMatch(/not linked to a loan/)
    expect(voidedRowNote('reversed')).toBeNull()
    expect(voidedRowNote(null)).toBeNull()
  })
})
