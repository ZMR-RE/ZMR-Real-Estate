import { describe, expect, it, vi } from 'vitest'
import { getLeaseStatus } from './leaseStatus'
import { propertyTenantRows } from './leasesQueries'

vi.mock('../../shared/supabaseClient', () => ({ supabase: {} }))

describe('lease status: one rule for Tenants, Units and Lease history', () => {
  it('is upcoming before the start date, active through the end date, ended after it', () => {
    expect(getLeaseStatus({ start_date: '2026-10-15', end_date: null }, '2026-10-02')).toBe('upcoming')
    expect(getLeaseStatus({ start_date: '2026-10-02', end_date: null }, '2026-10-02')).toBe('active')
    expect(getLeaseStatus({ start_date: '2026-01-01', end_date: '2026-10-02' }, '2026-10-02')).toBe('active')
    expect(getLeaseStatus({ start_date: '2026-01-01', end_date: '2026-10-01' }, '2026-10-02')).toBe('ended')
  })
})

describe('Tenants box rows', () => {
  const unit = { id: 'u1', unit_label: 'Unit 1' }
  const t = (id: string) => ({ tenant: { id, name: id } })

  it('labels a tenancy that has not started as upcoming, not current', () => {
    const rows = propertyTenantRows(
      [
        { id: 'future', start_date: '2026-11-01', end_date: null, unit, lease_tenants: [t('casey')] },
        { id: 'now', start_date: '2026-01-01', end_date: '2026-12-31', unit, lease_tenants: [t('riley')] },
        { id: 'old', start_date: '2025-01-01', end_date: '2025-06-30', unit, lease_tenants: [t('sam')] },
      ],
      '2026-10-02',
    )
    expect(rows.map((r) => [r.tenant.id, r.status])).toEqual([
      ['casey', 'upcoming'],
      ['riley', 'active'],
      ['sam', 'ended'],
    ])
  })

  it('keeps one row per tenant per lease and skips missing tenants', () => {
    const rows = propertyTenantRows(
      [{ id: 'l1', start_date: '2026-01-01', end_date: null, unit, lease_tenants: [t('a'), t('a'), { tenant: null }, t('b')] }],
      '2026-10-02',
    )
    expect(rows.map((r) => r.tenant.id)).toEqual(['a', 'b'])
  })
})
