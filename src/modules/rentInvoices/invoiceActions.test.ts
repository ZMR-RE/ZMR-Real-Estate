import { describe, expect, it } from 'vitest'
import { actionRunner, closingActions, type RpcError } from './invoiceActions'
import { draft, issued } from './invoiceSampleFixtures'
import { detailPanelFor, issuedActionsOpen, STATE_LABEL } from './invoiceWorkflowLogic'
import type { RentInvoiceRow } from './rentInvoiceTypes'

// F-1 regression: after Reject draft / Cancel invoice, the open details panel
// must show the saved result, not the status and actions it had before.
// The fake screen follows the hook's refresh contract: with an id, the open
// panel re-reads that invoice from the (fake) database.
function setup(rows: RentInvoiceRow[], opened: RentInvoiceRow, failWith: RpcError = null) {
  const db = new Map(rows.map((r) => [r.id, { ...r }]))
  const screen = { selected: opened as RentInvoiceRow | null, error: null as string | null, notice: null as string | null, refreshedWith: [] as (string | null)[], recordsChanged: 0 }
  const run = actionRunner({
    setBusy: () => {},
    setError: (m) => (screen.error = m),
    setNotice: (m) => (screen.notice = m),
    refresh: async (keepId) => {
      screen.refreshedWith.push(keepId)
      if (keepId) screen.selected = db.get(keepId) ?? null
    },
    onRecordsChanged: () => screen.recordsChanged++,
  })
  const write = (id: string, change: Partial<RentInvoiceRow>) => {
    if (failWith) return Promise.resolve({ data: null, error: failWith })
    const row = db.get(id)!
    db.set(id, { ...row, ...change, version: row.version + 1 })
    return Promise.resolve({ data: null, error: null })
  }
  const actions = closingActions(run, {
    rejectInvoice: (id) => write(id, { state: 'rejected' }),
    cancelInvoice: (id) => write(id, { state: 'cancelled' }),
  })
  return { db, screen, actions }
}

const openDraft: RentInvoiceRow = { ...draft, id: 'inv-draft', state: 'approved' }
const openIssued: RentInvoiceRow = { ...issued, id: 'inv-issued' }

describe('closing actions refresh the open details panel (F-1)', () => {
  it('Reject draft re-reads the invoice, so the review panel and its Approve/Issue actions close', async () => {
    const { screen, actions } = setup([openDraft], openDraft)
    expect(detailPanelFor(screen.selected!)).toBe('review')
    await actions.reject(openDraft, null)
    expect(screen.refreshedWith).toEqual(['inv-draft'])
    expect(screen.selected?.state).toBe('rejected')
    expect(detailPanelFor(screen.selected!)).toBeNull()
    expect(screen.notice).toBe('Draft rejected.')
    expect(screen.recordsChanged).toBe(1)
  })

  it('Cancel invoice re-reads the invoice, so the panel shows it cancelled with no Revise/Cancel', async () => {
    const { screen, actions } = setup([openIssued], openIssued)
    expect(issuedActionsOpen(screen.selected!)).toBe(true)
    await actions.cancel(openIssued.id, openIssued.version, 'Entered twice')
    expect(screen.refreshedWith).toEqual(['inv-issued'])
    expect(screen.selected?.state).toBe('cancelled')
    expect(screen.selected?.version).toBe(openIssued.version + 1)
    expect(detailPanelFor(screen.selected!)).toBe('issued')
    expect(STATE_LABEL[screen.selected!.state]).toBe('Cancelled (number kept)')
    expect(issuedActionsOpen(screen.selected!)).toBe(false)
    expect(screen.notice).toBe('Invoice cancelled. Its number is kept and never reused.')
  })

  it('a refused cancel (payments recorded, ZM338) changes nothing and keeps the panel as it was', async () => {
    const { db, screen, actions } = setup([openIssued], openIssued, { code: 'ZM338', message: 'raw' })
    await actions.cancel(openIssued.id, openIssued.version, 'Entered twice')
    expect(screen.error).toBe('Payments are recorded against this invoice, so it can’t be cancelled here.')
    expect(screen.refreshedWith).toEqual([])
    expect(screen.recordsChanged).toBe(0)
    expect(screen.selected).toBe(openIssued)
    expect(db.get('inv-issued')?.state).toBe('issued')
    expect(issuedActionsOpen(screen.selected!)).toBe(true)
  })

  it('a stale reject (ZM324) re-reads the same invoice to show the newer version', async () => {
    const { screen, actions } = setup([openDraft], openDraft, { code: 'ZM324', message: 'raw' })
    await actions.reject(openDraft, null)
    expect(screen.error).toMatch(/changed since you opened it/)
    expect(screen.refreshedWith).toEqual(['inv-draft'])
    expect(screen.recordsChanged).toBe(0)
  })
})

describe('details panel per state', () => {
  it('reviews drafts and approved invoices, shows numbered issued/superseded/cancelled read-only, nothing else', () => {
    expect(detailPanelFor({ state: 'draft', number: null })).toBe('review')
    expect(detailPanelFor({ state: 'approved', number: null })).toBe('review')
    expect(detailPanelFor({ state: 'issued', number: 'A-INV-000001' })).toBe('issued')
    expect(detailPanelFor({ state: 'superseded', number: 'A-INV-000001' })).toBe('issued')
    expect(detailPanelFor({ state: 'cancelled', number: 'A-INV-000001' })).toBe('issued')
    expect(detailPanelFor({ state: 'issued', number: null })).toBeNull()
    expect(detailPanelFor({ state: 'rejected', number: null })).toBeNull()
  })

  it('offers Revise/Cancel only on a live issued invoice', () => {
    expect(issuedActionsOpen({ state: 'issued' })).toBe(true)
    for (const state of ['superseded', 'cancelled', 'rejected', 'draft', 'approved'] as const) expect(issuedActionsOpen({ state })).toBe(false)
  })
})
