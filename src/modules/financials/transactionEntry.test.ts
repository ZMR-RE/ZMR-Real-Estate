import { afterEach, describe, expect, it, vi } from 'vitest'
import { todayLocalIsoDate } from '../../shared/dateFormat'
import { payerColumns, type TransactionInput } from './financialsQueries'
import {
  attachmentFileName,
  blankTransaction,
  buildYearOptions,
  classifySaveError,
  nextEntryDraft,
  tenantOptionLabel,
  transactionToInput,
  validateTransaction,
} from './transactionEntry'
import { M5_TRANSACTIONS } from './m5Ledger.fixture'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

const complete: TransactionInput = {
  ...blankTransaction('2018-06-15'),
  propertyId: 't2-prop',
  entryType: 'income',
  category: 'rents_received',
  payer: { kind: 'tenant', id: 't2-tenant' },
  paymentMethod: 'ZMR-TEST-T2 Bank',
  amount: 1200,
  description: 'ZMR-TEST-T2 June 2018 rent',
}

describe('local "today" (M2)', () => {
  it('uses the viewer calendar date, not UTC, in a US evening', () => {
    vi.stubEnv('TZ', 'America/Chicago')
    vi.useFakeTimers()
    // 9:30pm Sep 28 in Chicago is already Sep 29 in UTC.
    vi.setSystemTime(new Date('2026-09-29T02:30:00Z'))
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-09-29')
    expect(todayLocalIsoDate()).toBe('2026-09-28')
    expect(blankTransaction().transactionDate).toBe('2026-09-28')
  })
})

describe('Save and add another draft (M2)', () => {
  it('keeps only property and date; clears payer, amount, category, description, payment, flag', () => {
    const saved: TransactionInput = {
      ...complete,
      entryType: 'expense',
      category: 'repairs',
      payer: { kind: 'vendor', id: 'v' },
      repairOrImprovement: 'improvement',
      subcategory: 'Plumbing',
      unit: 'Unit 1',
    }
    const next = nextEntryDraft(saved)
    expect(next).toEqual({ ...blankTransaction('2018-06-15'), propertyId: 't2-prop' })
    expect(next.payer).toEqual({ kind: 'none' })
    expect(next.amount).toBe(0)
    expect(next.paymentMethod).toBe('')
    expect(next.repairOrImprovement).toBeNull()
  })

  it('never alters an explicitly entered historical date', () => {
    expect(nextEntryDraft({ ...complete, transactionDate: '2018-01-01' }).transactionDate).toBe('2018-01-01')
  })
})

describe('validation (M3)', () => {
  it('accepts a complete 2018 tenant-paid income entry', () => {
    expect(validateTransaction(complete, true)).toEqual({})
  })

  it('names every missing required field for a blank new entry', () => {
    const errors = validateTransaction(blankTransaction('2025-01-01'), true)
    expect(Object.keys(errors).sort()).toEqual(['amount', 'payer', 'paymentMethod', 'propertyId'])
  })

  it('rejects a tenant as payer of an expense, bad dates and fractions of a cent', () => {
    expect(validateTransaction({ ...complete, entryType: 'expense', category: 'repairs' }, true).payer).toMatch(/tenant can only/)
    expect(validateTransaction({ ...complete, transactionDate: '2025-02-30' }, true).transactionDate).toBeDefined()
    expect(validateTransaction({ ...complete, amount: 10.005 }, true).amount).toMatch(/two decimal/)
    expect(validateTransaction({ ...complete, amount: 19.99 }, true).amount).toBeUndefined()
  })

  it('lets an edit keep a stored transaction that has no payer (bridged receipt)', () => {
    const noPayer = { ...complete, payer: { kind: 'none' } as const }
    expect(validateTransaction(noPayer, false).payer).toBeUndefined()
    expect(validateTransaction(noPayer, true).payer).toBeDefined()
  })

  it('has no hard-coded earliest year', () => {
    expect(validateTransaction({ ...complete, transactionDate: '2018-01-01' }, true)).toEqual({})
    expect(validateTransaction({ ...complete, transactionDate: '2009-12-31' }, true)).toEqual({})
  })
})

describe('save outcome classification (M2)', () => {
  it('a server answer with a code is a confirmed failure', () => {
    expect(classifySaveError({ message: 'The 2018 financial period is locked.', code: 'ZM010' })).toEqual({
      kind: 'failed',
      message: 'Not saved: The 2018 financial period is locked.',
    })
  })

  it('a dropped connection is uncertain, not "failed"', () => {
    const outcome = classifySaveError({ message: 'TypeError: Failed to fetch', code: '' })
    expect(outcome.kind).toBe('uncertain')
    expect(outcome.message).toMatch(/couldn't confirm whether this was saved/)
  })
})

describe('payer mapping (M4)', () => {
  it('writes exactly one payer column', () => {
    expect(payerColumns({ kind: 'tenant', id: 't' })).toEqual({ vendor_id: null, tenant_id: 't', prospective_tenant_id: null })
    expect(payerColumns({ kind: 'vendor', id: 'v' })).toEqual({ vendor_id: 'v', tenant_id: null, prospective_tenant_id: null })
    expect(payerColumns({ kind: 'none' })).toEqual({ vendor_id: null, tenant_id: null, prospective_tenant_id: null })
  })

  it('reads a stored tenant, vendor or prospective tenant back unchanged for editing', () => {
    const income = M5_TRANSACTIONS.find((t) => t.entry_type === 'income')!
    expect(transactionToInput(income).payer).toEqual({ kind: 'tenant', id: 't2-m5-tenant' })
    const expense = M5_TRANSACTIONS.find((t) => t.entry_type === 'expense')!
    expect(transactionToInput(expense).payer).toEqual({ kind: 'vendor', id: 't2-m5-vendor' })
    const bridged = { ...income, tenant: null, prospective_tenant: { id: 'p1', name: 'ZMR-TEST-T2 Prospect' } }
    expect(payerColumns(transactionToInput(bridged).payer)).toEqual({ vendor_id: null, tenant_id: null, prospective_tenant_id: 'p1' })
  })

  it('labels tenants by unit and lease dates so repeat names are distinguishable', () => {
    const base = { tenantId: 't', tenantName: 'ZMR-TEST-T2 Rivera', leaseId: 'l1', unitLabel: 'Unit 1', startDate: '2018-03-01', endDate: '2019-02-28' }
    expect(tenantOptionLabel(base)).toBe('ZMR-TEST-T2 Rivera — Unit 1 (lease Mar 2018 – Feb 2019)')
    expect(tenantOptionLabel({ ...base, leaseId: 'l2', unitLabel: 'Unit 2', startDate: '2025-01-01', endDate: null })).toBe(
      'ZMR-TEST-T2 Rivera — Unit 2 (lease Jan 2025 – present)',
    )
  })
})

describe('year options (2018-onward history)', () => {
  it('reaches back to the earliest saved year, e.g. a 2018 purchase', () => {
    const years = buildYearOptions({ earliest: 2018, latest: 2026 }, 2026)
    expect(years[0]).toBe(2026)
    expect(years.at(-1)).toBe(2018)
    expect(years).toHaveLength(9)
  })

  it('always offers the recent window and any just-saved older year, even before data exists', () => {
    expect(buildYearOptions({ earliest: null, latest: null }, 2026)).toEqual([2026, 2025, 2024, 2023, 2022, 2021])
    expect(buildYearOptions({ earliest: null, latest: null }, 2026, [2018]).at(-1)).toBe(2018)
  })
})

describe('attachment file names (M3)', () => {
  it('shows the original name from the stored path without renaming anything', () => {
    expect(attachmentFileName('acct/prop/Receipt/0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e-ZMR-TEST-T2 receipt.pdf')).toBe('ZMR-TEST-T2 receipt.pdf')
    expect(attachmentFileName('acct/prop/Receipt/plain-name.png')).toBe('plain-name.png')
    expect(attachmentFileName(null)).toBe('Attachment')
  })
})
