import { describe, expect, it, vi } from 'vitest'

// Records the query chain each call builds, without a network — same
// pattern as bankReconciliationQueries.test.ts.
const calls: [string, unknown[]][] = []
vi.mock('../../shared/supabaseClient', () => {
  const chain: Record<string, (...args: unknown[]) => unknown> = {}
  for (const m of ['from', 'insert', 'update', 'select', 'eq', 'single', 'maybeSingle']) {
    chain[m] = (...args: unknown[]) => {
      calls.push([m, args])
      return chain
    }
  }
  return { supabase: chain }
})

// loan_number is free text specifically because a real loan number can
// carry leading zeros and letters that a numeric column would lose —
// these cases exercise exactly that, end to end through the query layer,
// to guard against a future change accidentally coercing it to a number
// or trimming it.
const LOAN_NUMBER_WITH_LEADING_ZEROS_AND_LETTERS = '00123-ABC-00987'

describe('createMortgageDetails — loan_number/loan_type preservation', () => {
  it('passes loan_number through untouched, leading zeros and letters intact', async () => {
    calls.length = 0
    const { createMortgageDetails } = await import('./mortgagePayoffQueries')
    await createMortgageDetails('acct-1', 'prop-1', {
      lender_name: 'First Bank',
      original_loan_amount: '200000',
      current_balance: '195000',
      interest_rate: '6.5',
      monthly_payment: '1264.14',
      loan_start_date: '2026-01-01',
      term_years: 30,
      escrow_balance: null,
      loan_number: LOAN_NUMBER_WITH_LEADING_ZEROS_AND_LETTERS,
      loan_type: 'Conventional',
    })

    const insertCall = calls.find(([m]) => m === 'insert')
    expect(insertCall).toBeDefined()
    const payload = insertCall![1][0] as Record<string, unknown>
    expect(payload.loan_number).toBe(LOAN_NUMBER_WITH_LEADING_ZEROS_AND_LETTERS)
    expect(payload.loan_type).toBe('Conventional')
  })

  it('passes both fields through as null when left blank — never guessed or defaulted', async () => {
    calls.length = 0
    const { createMortgageDetails } = await import('./mortgagePayoffQueries')
    await createMortgageDetails('acct-1', 'prop-1', {
      lender_name: null,
      original_loan_amount: '200000',
      current_balance: '195000',
      interest_rate: '6.5',
      monthly_payment: '1264.14',
      loan_start_date: '2026-01-01',
      term_years: 30,
      escrow_balance: null,
      loan_number: null,
      loan_type: null,
    })

    const insertCall = calls.find(([m]) => m === 'insert')
    const payload = insertCall![1][0] as Record<string, unknown>
    expect(payload.loan_number).toBeNull()
    expect(payload.loan_type).toBeNull()
  })
})

describe('updateMortgageDetails — loan_number/loan_type preservation', () => {
  it('passes an edited loan_number through untouched on update, same as create', async () => {
    calls.length = 0
    const { updateMortgageDetails } = await import('./mortgagePayoffQueries')
    await updateMortgageDetails('mortgage-1', {
      lender_name: 'First Bank',
      original_loan_amount: '200000',
      current_balance: '195000',
      interest_rate: '6.5',
      monthly_payment: '1264.14',
      loan_start_date: '2026-01-01',
      term_years: 30,
      escrow_balance: null,
      loan_number: '0099887-X',
      loan_type: 'HELOC',
    })

    const updateCall = calls.find(([m]) => m === 'update')
    expect(updateCall).toBeDefined()
    const payload = updateCall![1][0] as Record<string, unknown>
    expect(payload.loan_number).toBe('0099887-X')
    expect(payload.loan_type).toBe('HELOC')
  })
})

describe('getMortgageDetails — selects the new columns', () => {
  it('includes loan_number and loan_type in the select list', async () => {
    calls.length = 0
    const { getMortgageDetails } = await import('./mortgagePayoffQueries')
    await getMortgageDetails('prop-1')

    const selectCall = calls.find(([m]) => m === 'select')
    expect(selectCall).toBeDefined()
    const selected = selectCall![1][0] as string
    expect(selected).toContain('loan_number')
    expect(selected).toContain('loan_type')
  })
})
