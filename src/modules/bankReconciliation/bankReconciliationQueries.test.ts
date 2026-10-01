import { describe, expect, it, vi } from 'vitest'

// Records the query chain the reconciliation save builds, without a network.
const calls: [string, unknown[]][] = []
vi.mock('../../shared/supabaseClient', () => {
  const chain: Record<string, (...args: unknown[]) => unknown> = {}
  for (const m of ['from', 'update', 'eq', 'in', 'select']) {
    chain[m] = (...args: unknown[]) => {
      calls.push([m, args])
      return chain
    }
  }
  return { supabase: chain }
})

describe('markTransactionsReconciled', () => {
  it('never marks voided entries and returns the ids it did mark', async () => {
    const { markTransactionsReconciled } = await import('./bankReconciliationQueries')
    await markTransactionsReconciled('acct', ['t1', 't2'])
    expect(calls).toContainEqual(['update', [{ statement_reconciled: true }]])
    expect(calls).toContainEqual(['eq', ['account_id', 'acct']])
    expect(calls).toContainEqual(['eq', ['voided', false]])
    expect(calls).toContainEqual(['in', ['id', ['t1', 't2']]])
    expect(calls).toContainEqual(['select', ['id']])
  })

  it('the save check reads the original records by id, workspace-scoped, and writes nothing', async () => {
    calls.length = 0
    const { listReconciliationState } = await import('./bankReconciliationQueries')
    await listReconciliationState('acct', ['t1', 't2'])
    expect(calls).toContainEqual(['select', ['id, statement_reconciled, voided']])
    expect(calls).toContainEqual(['eq', ['account_id', 'acct']])
    expect(calls).toContainEqual(['in', ['id', ['t1', 't2']]])
    expect(calls.some(([m]) => m === 'update')).toBe(false)
  })
})
