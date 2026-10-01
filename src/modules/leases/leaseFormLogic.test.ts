import { beforeEach, describe, expect, it, vi } from 'vitest'
import { missingTenantIds, slotOptions, tenantsNamed, uniqueTenantIds } from './leaseFormLogic'

const options = [
  { id: 't1', label: 'Riley Example' },
  { id: 't2', label: 'Jordan Sample' },
  { id: 't3', label: 'Sam Sample' },
]

describe('lease form rules', () => {
  it('a co-tenant slot never offers someone chosen in another slot (no duplicate selection)', () => {
    expect(slotOptions(options, ['t1', null], 1).map((o) => o.id)).toEqual(['t2', 't3'])
    expect(slotOptions(options, ['t1', 't2'], 0).map((o) => o.id)).toEqual(['t1', 't3'])
  })

  it('saves each chosen person once, in slot order', () => {
    expect(uniqueTenantIds(['t2', null, 't1', 't2'])).toEqual(['t2', 't1'])
    expect(uniqueTenantIds([null])).toEqual([])
  })

  it('finds an existing tenant with the same name, ignoring case and spacing', () => {
    expect(tenantsNamed(options, '  riley   EXAMPLE ').map((o) => o.id)).toEqual(['t1'])
    expect(tenantsNamed(options, 'Riley Examples')).toEqual([])
    expect(tenantsNamed(options, '   ')).toEqual([])
  })

  it('links only the tenants a lease is still missing', () => {
    expect(missingTenantIds(['t1', 't2'], ['t1'])).toEqual(['t2'])
    expect(missingTenantIds(['t1'], ['t1'])).toEqual([])
  })
})

// createLease against a fake client: a link failure keeps the lease and
// returns its id; the retry updates that same lease and links only what's
// missing — never a second lease, and co-tenants share the one rent.
const db: { leases: Record<string, unknown>[]; links: { lease_id: string; tenant_id: string }[]; failLinksOnce: boolean } = { leases: [], links: [], failLinksOnce: false }
vi.mock('../../shared/supabaseClient', () => {
  const from = (table: string) => {
    const q: Record<string, unknown> = {}
    let filterLease: string | null = null
    q.insert = (rows: Record<string, unknown> | Record<string, unknown>[]) => {
      if (table === 'leases') {
        const row = { id: `lease-${db.leases.length + 1}`, ...(rows as Record<string, unknown>) }
        db.leases.push(row)
        return { select: () => ({ single: async () => ({ data: { id: row.id }, error: null }) }) }
      }
      if (db.failLinksOnce) {
        db.failLinksOnce = false
        return Promise.resolve({ error: { message: 'network dropped' } })
      }
      db.links.push(...(rows as { lease_id: string; tenant_id: string }[]))
      return Promise.resolve({ error: null })
    }
    q.update = (patch: Record<string, unknown>) => ({
      eq: async (_c: string, id: string) => {
        Object.assign(db.leases.find((l) => l.id === id)!, patch)
        return { error: null }
      },
    })
    q.select = () => q
    q.eq = (_c: string, v: string) => {
      filterLease = v
      return q
    }
    q.returns = async () => ({ data: db.links.filter((l) => l.lease_id === filterLease), error: null })
    return q
  }
  return { supabase: { from } }
})

describe('createLease retry after a partial failure', () => {
  beforeEach(() => {
    db.leases = []
    db.links = []
    db.failLinksOnce = false
  })

  const input = { tenantIds: ['t1', 't2'], startDate: '2026-11-01', endDate: null, rentAmount: '1500', lateFee: null, moveInFee: null }

  it('keeps the saved lease and finishes it on retry — one lease, both co-tenants, one rent', async () => {
    const { createLease } = await import('./leasesQueries')
    db.failLinksOnce = true
    const first = await createLease('acct', 'prop', 'unit', input)
    expect(first.error?.message).toBe('network dropped')
    expect(first.leaseId).toBe('lease-1')
    expect(db.leases).toHaveLength(1)
    expect(db.links).toHaveLength(0)

    const retry = await createLease('acct', 'prop', 'unit', { ...input, rentAmount: '1550' }, first.leaseId)
    expect(retry).toEqual({ leaseId: 'lease-1', error: null })
    expect(db.leases).toHaveLength(1)
    expect(db.leases[0].rent_amount).toBe('1550')
    expect(db.links.map((l) => l.tenant_id).sort()).toEqual(['t1', 't2'])
  })

  it('a retry after only some links saved adds just the missing ones', async () => {
    const { createLease } = await import('./leasesQueries')
    await createLease('acct', 'prop', 'unit', { ...input, tenantIds: ['t1'] })
    const retry = await createLease('acct', 'prop', 'unit', input, 'lease-1')
    expect(retry.error).toBeNull()
    expect(db.leases).toHaveLength(1)
    expect(db.links.map((l) => l.tenant_id)).toEqual(['t1', 't2'])
  })
})
