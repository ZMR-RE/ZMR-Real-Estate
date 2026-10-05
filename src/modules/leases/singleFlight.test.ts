import { describe, expect, it, vi } from 'vitest'
import { createSingleFlight } from './singleFlight'

const later = <T,>(ms: number, value: T) => new Promise<T>((r) => setTimeout(() => r(value), ms))

describe('single-flight save guard', () => {
  it('a burst during a slow save runs the save exactly once', async () => {
    const f = createSingleFlight()
    const save = vi.fn(() => later(50, 'saved'))
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => f.run(save)))
    expect(save).toHaveBeenCalledTimes(1)
    expect(results.filter((r) => r.ran)).toHaveLength(1)
  })

  it('a failed save releases the guard, so a retry runs', async () => {
    const f = createSingleFlight()
    const save = vi.fn<() => Promise<boolean>>().mockReturnValueOnce(later(20, false)).mockReturnValueOnce(later(20, true))
    expect(await f.run(save, (ok) => ok)).toEqual({ ran: true, value: false })
    expect(await f.run(save, (ok) => ok)).toEqual({ ran: true, value: true })
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('a thrown error releases the guard too', async () => {
    const f = createSingleFlight()
    await expect(f.run(() => Promise.reject(new Error('network')))).rejects.toThrow('network')
    expect((await f.run(() => later(1, 'ok'))).ran).toBe(true)
  })

  it('after a success the same form cannot save again until reset (the next add)', async () => {
    const f = createSingleFlight()
    const save = vi.fn(() => later(5, true))
    await f.run(save, (ok) => ok)
    expect((await f.run(save, (ok) => ok)).ran).toBe(false)
    f.reset()
    expect((await f.run(save, (ok) => ok)).ran).toBe(true)
    expect(save).toHaveBeenCalledTimes(2)
  })
})

// End to end against a slow fake database: a burst of Saves through the
// guard makes one lease and one link (rent stored once); a burst of
// co-tenant Saves makes one link; a failed link followed by a retry burst
// finishes the same lease.
const db: { leases: Record<string, unknown>[]; links: { lease_id: string; tenant_id: string }[]; failLinksOnce: boolean } = { leases: [], links: [], failLinksOnce: false }
vi.mock('../../shared/supabaseClient', () => {
  const from = (table: string) => {
    const q: Record<string, unknown> = {}
    let filterLease: string | null = null
    q.insert = (rows: Record<string, unknown> | Record<string, unknown>[]) => {
      if (table === 'leases') {
        const row = { id: `lease-${db.leases.length + 1}`, ...(rows as Record<string, unknown>) }
        return { select: () => ({ single: async () => { await later(30, 0); db.leases.push(row); return { data: { id: row.id }, error: null } } }) }
      }
      return later(30, 0).then(() => {
        if (db.failLinksOnce) {
          db.failLinksOnce = false
          return { error: { message: 'network dropped' } }
        }
        db.links.push(...(rows as { lease_id: string; tenant_id: string }[]))
        return { error: null }
      })
    }
    q.update = (patch: Record<string, unknown>) => ({ eq: async (_c: string, id: string) => { Object.assign(db.leases.find((l) => l.id === id)!, patch); return { error: null } } })
    q.select = () => q
    q.eq = (_c: string, v: string) => { filterLease = v; return q }
    q.returns = async () => ({ data: db.links.filter((l) => l.lease_id === filterLease), error: null })
    return q
  }
  return { supabase: { from } }
})

describe('guarded tenancy saves against a slow database', () => {
  const input = { tenantIds: ['t1'], startDate: '2026-11-01', endDate: null, rentAmount: '777', lateFee: null, moveInFee: null }

  it('five rapid Saves of a new tenancy: one lease, one link, rent once', async () => {
    db.leases = []; db.links = []; db.failLinksOnce = false
    const { saveTenancy } = await import('./leaseEntryQueries')
    const f = createSingleFlight()
    await Promise.all([1, 2, 3, 4, 5].map(() => f.run(() => saveTenancy('a', 'p', 'u', { kind: 'new' }, input, null), (r) => !r.error)))
    expect(db.leases).toHaveLength(1)
    expect(db.links).toHaveLength(1)
    expect(db.leases.map((l) => Number(l.rent_amount)).reduce((x, y) => x + y, 0)).toBe(777)
  })

  it('five rapid co-tenant Saves: one link, no lease, rent untouched', async () => {
    db.leases = [{ id: 'lease-1', rent_amount: '1000' }]; db.links = [{ lease_id: 'lease-1', tenant_id: 't1' }]; db.failLinksOnce = false
    const { saveTenancy } = await import('./leaseEntryQueries')
    const f = createSingleFlight()
    await Promise.all([1, 2, 3, 4, 5].map(() => f.run(() => saveTenancy('a', 'p', 'u', { kind: 'cotenant', lease: { id: 'lease-1' } }, { ...input, tenantIds: ['t2'] }, null), (r) => !r.error)))
    expect(db.leases).toHaveLength(1)
    expect(db.leases[0].rent_amount).toBe('1000')
    expect(db.links.map((l) => l.tenant_id)).toEqual(['t1', 't2'])
  })

  it('a failed link, then a retry burst, finishes the same lease once', async () => {
    db.leases = []; db.links = []; db.failLinksOnce = true
    const { saveTenancy } = await import('./leaseEntryQueries')
    const f = createSingleFlight()
    let pending: string | null = null
    const attempt = () => f.run(async () => {
      const r = await saveTenancy('a', 'p', 'u', { kind: 'new' }, input, pending)
      if (r.error) pending = r.leaseId
      return r
    }, (r) => !r.error)
    await Promise.all([attempt(), attempt(), attempt()])
    expect(db.leases).toHaveLength(1)
    expect(db.links).toHaveLength(0)
    await Promise.all([attempt(), attempt(), attempt()])
    expect(db.leases).toHaveLength(1)
    expect(db.links).toHaveLength(1)
  })
})
