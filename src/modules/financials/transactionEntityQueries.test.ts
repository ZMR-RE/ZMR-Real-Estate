import { describe, expect, it, vi } from 'vitest'
import { blankTransaction } from './transactionEntry'

// Records the query chains built for the entity, without a network.
const calls: [string, unknown[]][] = []
vi.mock('../../shared/supabaseClient', () => {
  const chain: Record<string, (...args: unknown[]) => unknown> = {}
  for (const m of ['from', 'insert', 'update', 'eq', 'is', 'gte', 'lte', 'order', 'select', 'single', 'returns']) {
    chain[m] = (...args: unknown[]) => {
      calls.push([m, args])
      return chain
    }
  }
  chain.rpc = (...args: unknown[]) => {
    calls.push(['rpc', args])
    return Promise.resolve({ data: 'e1', error: null })
  }
  return { supabase: chain }
})

const input = { ...blankTransaction('2025-05-01'), propertyId: 'p1', paymentMethod: 'Checking', amount: 10, responsibleEntityId: 'e1' }

describe('responsible entity writes', () => {
  it('a new transaction saves exactly the entity the owner chose', async () => {
    calls.length = 0
    const { createTransaction } = await import('./financialsQueries')
    await createTransaction('acct', 'user', input)
    const insert = calls.find(([m]) => m === 'insert')?.[1][0] as Record<string, unknown>
    expect(insert.responsible_entity_id).toBe('e1')
  })

  it('an edit saves the chosen entity, and clearing it saves null', async () => {
    calls.length = 0
    const { updateTransaction } = await import('./financialsQueries')
    await updateTransaction('t1', { ...input, responsibleEntityId: null })
    const update = calls.find(([m]) => m === 'update')?.[1][0] as Record<string, unknown>
    expect(update).toHaveProperty('responsible_entity_id', null)
  })

  it('the bulk import and Capture paths never assign an entity', async () => {
    calls.length = 0
    const { bulkCreateTransactions, createTransactionFromCapture } = await import('./financialsQueries')
    await bulkCreateTransactions('acct', 'user', [
      { propertyId: 'p1', entryType: 'expense', category: 'repairs', subcategory: null, vendorId: null, unit: null, paymentMethod: 'Checking', repairOrImprovement: null, amount: 1, transactionDate: '2025-05-01', description: null },
    ])
    await createTransactionFromCapture('acct', 'user', {
      propertyId: 'p1', entryType: 'expense', category: 'repairs', subcategory: null, vendorId: null, tenantId: null, prospectiveTenantId: null, unit: null, paymentMethod: 'Checking', repairOrImprovement: null, amount: 1, transactionDate: '2025-05-01', description: null,
    })
    const inserted = calls.filter(([m]) => m === 'insert').flatMap(([, args]) => (Array.isArray(args[0]) ? args[0] : [args[0]])) as Record<string, unknown>[]
    expect(inserted).toHaveLength(2)
    for (const row of inserted) expect(row).not.toHaveProperty('responsible_entity_id')
  })
})

describe('Needs-entity reads', () => {
  it('the list filter selects only rows with no entity', async () => {
    calls.length = 0
    const { listTransactions } = await import('./financialsQueries')
    await listTransactions('acct', { year: 2025, needsEntity: true })
    expect(calls).toContainEqual(['is', ['responsible_entity_id', null]])
    expect(calls).toContainEqual(['eq', ['voided', false]])
  })

  it('without the filter, no entity condition is added', async () => {
    calls.length = 0
    const { listTransactions } = await import('./financialsQueries')
    await listTransactions('acct', { year: 2025 })
    expect(calls.some(([m]) => m === 'is')).toBe(false)
  })

  it('the Action Queue count reads active, unassigned rows in this workspace', async () => {
    calls.length = 0
    const { listNeedsEntityDates } = await import('./transactionEntityQueries')
    await listNeedsEntityDates('acct')
    expect(calls).toContainEqual(['eq', ['account_id', 'acct']])
    expect(calls).toContainEqual(['eq', ['voided', false]])
    expect(calls).toContainEqual(['is', ['responsible_entity_id', null]])
    expect(calls.some(([m]) => m === 'update' || m === 'insert')).toBe(false)
  })

  it('the suggestion is only read, never written', async () => {
    calls.length = 0
    const { suggestTransactionEntity } = await import('./transactionEntityQueries')
    const result = await suggestTransactionEntity('p1', '2025-05-01')
    expect(calls).toEqual([['rpc', ['suggested_transaction_entity', { p_property_id: 'p1', p_date: '2025-05-01' }]]])
    expect(result.data).toBe('e1')
  })
})
