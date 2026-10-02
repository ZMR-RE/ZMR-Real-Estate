import { describe, expect, it } from 'vitest'
import { isHistoryTableMissing, resolveHistoryPrincipal, sumHistoryPrincipal } from './reportsHistory'

// A3: "no history entries" ONLY for a missing-relation answer that names the
// exact history table in its message or details. Never via the hint.
const PGRST205 = {
  code: 'PGRST205',
  message: "Could not find the table 'public.mortgage_history_payments' in the schema cache",
  details: null,
  hint: "Perhaps you meant the table 'public.mortgage_payments'",
}

describe('isHistoryTableMissing', () => {
  it('PGRST205 naming the exact table in the message', () => expect(isHistoryTableMissing(PGRST205)).toBe(true))
  it('42P01 naming the exact table (Postgres wording, with or without schema)', () => {
    expect(isHistoryTableMissing({ code: '42P01', message: 'relation "public.mortgage_history_payments" does not exist' })).toBe(true)
    expect(isHistoryTableMissing({ code: '42P01', message: 'relation "mortgage_history_payments" does not exist' })).toBe(true)
  })
  it('the exact table named only in details', () => {
    expect(isHistoryTableMissing({ code: 'PGRST205', message: 'Could not find the table', details: 'public.mortgage_history_payments' })).toBe(true)
  })
  it('NOT when only the hint names the history table (another table is missing)', () => {
    expect(
      isHistoryTableMissing({
        code: 'PGRST205',
        message: "Could not find the table 'public.mortgage_history_paymnts' in the schema cache",
        hint: "Perhaps you meant the table 'public.mortgage_history_payments'",
      }),
    ).toBe(false)
  })
  it('NOT for a different or longer table name', () => {
    expect(isHistoryTableMissing({ code: '42P01', message: 'relation "public.mortgage_history_escrow" does not exist' })).toBe(false)
    expect(isHistoryTableMissing({ code: '42P01', message: 'relation "public.mortgage_history_payments_old" does not exist' })).toBe(false)
    expect(isHistoryTableMissing({ code: '42P01', message: 'relation "public.mortgage_payments" does not exist' })).toBe(false)
  })
  it('NOT for other codes even when the table is named (permission, missing column, network)', () => {
    expect(isHistoryTableMissing({ code: '42501', message: 'permission denied for table mortgage_history_payments' })).toBe(false)
    expect(isHistoryTableMissing({ code: '42703', message: 'column mortgage_history_payments.principal_amount does not exist' })).toBe(false)
    expect(isHistoryTableMissing({ code: 'PGRST204', message: "Could not find the 'x' column of 'mortgage_history_payments'" })).toBe(false)
    expect(isHistoryTableMissing({ code: '', message: 'TypeError: Failed to fetch' })).toBe(false)
    expect(isHistoryTableMissing({ message: 'mortgage_history_payments' })).toBe(false)
  })
  it('no error is not "missing"', () => expect(isHistoryTableMissing(null)).toBe(false))
})

describe('resolveHistoryPrincipal', () => {
  it('missing table → no history entries, no error (before H2)', () => {
    expect(resolveHistoryPrincipal({ data: null, error: PGRST205 })).toEqual({ rows: [], error: null })
  })
  it('any other error stays an error — never a silent empty result', () => {
    expect(resolveHistoryPrincipal({ data: null, error: { code: '42501', message: 'permission denied for table mortgage_history_payments' } })).toEqual({
      rows: [],
      error: 'permission denied for table mortgage_history_payments',
    })
    expect(resolveHistoryPrincipal({ data: null, error: { code: '503', message: '' } }).error).toBe('Could not load history-only mortgage entries.')
  })
  it('rows pass through (after H2)', () => {
    const rows = [{ property_id: 'p1', principal_amount: 300 }]
    expect(resolveHistoryPrincipal({ data: rows, error: null })).toEqual({ rows, error: null })
  })
})

describe('sumHistoryPrincipal', () => {
  const rows = [
    { property_id: 'p1', principal_amount: 0.1 },
    { property_id: 'p1', principal_amount: 0.2 },
    { property_id: 'p2', principal_amount: 5 },
  ]
  it('sums in cents', () => expect(sumHistoryPrincipal(rows)).toBe(5.3))
  it('applies the Reports property filter', () => expect(sumHistoryPrincipal(rows, 'p1')).toBe(0.3))
})
