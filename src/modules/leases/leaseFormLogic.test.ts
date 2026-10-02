import { beforeEach, describe, expect, it, vi } from 'vitest'
import { leaseFormForChoice, leaseFormInitial, missingTenantIds, slotOptions, tenantDetail, tenantsNamed, unfinishedLeases, uniqueTenantIds, withSameNameDetails } from './leaseFormLogic'

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

  it('same-name people show distinguishing details in the picker; unique names stay plain', () => {
    const people = [
      { id: 'a', label: 'Riley Example', detail: 'riley@example.com · added Oct 1, 2026' },
      { id: 'b', label: 'riley  example', detail: 'no email or phone on file · added Oct 2, 2026' },
      { id: 'c', label: 'Morgan Demo', detail: 'no email or phone on file' },
    ]
    expect(withSameNameDetails(people).map((o) => o.label)).toEqual([
      'Riley Example — riley@example.com · added Oct 1, 2026',
      'riley  example — no email or phone on file · added Oct 2, 2026',
      'Morgan Demo',
    ])
    const fmt = (d: string) => `<${d}>`
    expect(tenantDetail({ email: 'a@b.c', phone: '555', created_at: '2026-10-01T12:00:00Z' }, fmt)).toBe('a@b.c · 555 · added <2026-10-01>')
    expect(tenantDetail({ email: null, phone: null }, fmt)).toBe('no email or phone on file')
  })

  it('an unfinished tenancy is a live lease with no tenants linked', () => {
    const leases = [
      { id: 'l1', archived: false, tenants: [] },
      { id: 'l2', archived: true, tenants: [] },
      { id: 'l3', archived: false, tenants: [{ id: 't1' }] },
    ]
    expect(unfinishedLeases(leases).map((l) => l.id)).toEqual(['l1'])
    expect(leaseFormInitial({ start_date: '2026-11-01', end_date: null, rent_amount: 1500, late_fee: null, move_in_fee: '50' })).toEqual({
      startDate: '2026-11-01', endDate: null, rentAmount: '1500', lateFee: null, moveInFee: '50',
    })
  })

  it('one lease form per chosen kind: resume prefills, co-tenant shows people only and never someone already on it', () => {
    const lease = { id: 'L1', start_date: '2026-11-01', end_date: null, rent_amount: 1600, late_fee: null, move_in_fee: null, tenants: [{ id: 't1' }] }
    expect(leaseFormForChoice({ kind: 'new' }, options)).toMatchObject({ key: 'new', tenantsOnly: false, initial: undefined })
    expect(leaseFormForChoice({ kind: 'resume', lease }, options)).toMatchObject({ key: 'resume:L1', tenantsOnly: false, initial: { rentAmount: '1600' } })
    const co = leaseFormForChoice({ kind: 'cotenant', lease }, options)
    expect(co.tenantsOnly).toBe(true)
    expect(co.tenantOptions.map((o) => o.id)).toEqual(['t2', 't3'])
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
    const { createLease } = await import('./leaseEntryQueries')
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

  it('after leaving or reloading, the unfinished lease is found from saved rows and resumed by ID — one lease, rent once', async () => {
    const { createLease } = await import('./leaseEntryQueries')
    db.failLinksOnce = true
    await createLease('acct', 'prop', 'unit', input)
    // Screen memory is gone (Cancel / navigation / reload): only saved rows remain.
    const saved = db.leases.map((l) => ({ ...(l as { id: string }), archived: false, tenants: db.links.filter((k) => k.lease_id === l.id) }))
    const [unfinished] = unfinishedLeases(saved)
    expect(unfinished.id).toBe('lease-1')
    const resumed = await createLease('acct', 'prop', 'unit', input, unfinished.id)
    expect(resumed).toEqual({ leaseId: 'lease-1', error: null })
    expect(db.leases).toHaveLength(1)
    expect(db.leases.map((l) => Number(l.rent_amount)).reduce((a, b) => a + b, 0)).toBe(1500)
    expect(db.links.map((l) => l.tenant_id).sort()).toEqual(['t1', 't2'])
  })

  it('adding a co-tenant links the person only — no new lease, the rent untouched', async () => {
    const { addCoTenants, createLease } = await import('./leaseEntryQueries')
    await createLease('acct', 'prop', 'unit', { ...input, tenantIds: ['t1'] })
    const result = await addCoTenants('acct', 'lease-1', ['t1', 't2'])
    expect(result.error).toBeNull()
    expect(db.leases).toHaveLength(1)
    expect(db.leases[0].rent_amount).toBe('1500')
    expect(db.links.map((l) => l.tenant_id)).toEqual(['t1', 't2'])
  })

  it('saveTenancy (both entry points): co-tenant links only; resume finishes the chosen lease; new creates one', async () => {
    const { createLease, saveTenancy } = await import('./leaseEntryQueries')
    await createLease('acct', 'prop', 'unit', { ...input, tenantIds: ['t1'] })
    expect(await saveTenancy('acct', 'prop', 'unit', { kind: 'cotenant', lease: { id: 'lease-1' } }, { ...input, tenantIds: ['t2'], rentAmount: '9999' }, null)).toEqual({ leaseId: null, error: null })
    expect(db.leases).toHaveLength(1)
    expect(db.leases[0].rent_amount).toBe('1500')
    db.failLinksOnce = true
    const partial = await saveTenancy('acct', 'prop', 'unit', { kind: 'new' }, { ...input, tenantIds: ['t3'], rentAmount: '900' }, null)
    expect(partial.leaseId).toBe('lease-2')
    const resumed = await saveTenancy('acct', 'prop', 'unit', { kind: 'resume', lease: { id: 'lease-2' } }, { ...input, tenantIds: ['t3'], rentAmount: '900' }, null)
    expect(resumed).toEqual({ leaseId: 'lease-2', error: null })
    expect(db.leases).toHaveLength(2)
    expect(db.links.map((l) => `${l.lease_id}:${l.tenant_id}`)).toEqual(['lease-1:t1', 'lease-1:t2', 'lease-2:t3'])
  })

  it('a retry after only some links saved adds just the missing ones', async () => {
    const { createLease } = await import('./leaseEntryQueries')
    await createLease('acct', 'prop', 'unit', { ...input, tenantIds: ['t1'] })
    const retry = await createLease('acct', 'prop', 'unit', input, 'lease-1')
    expect(retry.error).toBeNull()
    expect(db.leases).toHaveLength(1)
    expect(db.links.map((l) => l.tenant_id)).toEqual(['t1', 't2'])
  })
})
