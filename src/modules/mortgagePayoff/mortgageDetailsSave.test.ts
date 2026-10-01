import { describe, expect, it } from 'vitest'
import { saveMortgageDetails, type MortgageDetailsSaveDeps } from './mortgageDetailsSave'
import { friendlyDatabaseError, isSimultaneousChange } from './mortgageBalanceIntegrity'
import type { BalanceResetRequest, MortgageDetails, MortgageDetailsInput } from './mortgagePayoffQueries'

// B-1 (hosted Practice, abf2b35): a refused save used to replace the whole Mortgage tab. Every refusal must now return
// ok:false with an actionable message (the hook keeps the form open with the user's entries), and any replacement
// loan record must be the stored one, so the next attempt is checked against reality.

const loan: MortgageDetails = {
  id: 'loan-1', property_id: 'prop-1', lender_name: 'ZMR-TEST Bank', original_loan_amount: '200000.00',
  current_balance: '149000.00', interest_rate: '6.5', monthly_payment: '1264.14', loan_start_date: '2020-01-01',
  term_years: 30, escrow_balance: '1000.00', loan_number: null, loan_type: null, principal_version: 6, escrow_version: 3,
}
const input = (over: Partial<MortgageDetailsInput> = {}): MortgageDetailsInput => {
  const { id: _id, property_id: _p, principal_version: _pv, escrow_version: _ev, ...rest } = loan
  return { ...rest, ...over }
}
const stored: MortgageDetails = { ...loan, current_balance: '148500.00', principal_version: 7 }

type Calls = { create: number; reset: BalanceResetRequest[]; update: number; fetchLatest: number }
function deps(over: Partial<{ [K in keyof MortgageDetailsSaveDeps]: Awaited<ReturnType<MortgageDetailsSaveDeps[K]>> }> = {}) {
  const calls: Calls = { create: 0, reset: [], update: 0, fetchLatest: 0 }
  const d: MortgageDetailsSaveDeps = {
    create: async () => { calls.create++; return over.create ?? { data: loan, error: null } },
    reset: async (req) => { calls.reset.push(req); return over.reset ?? { data: {}, error: null } },
    update: async () => { calls.update++; return over.update ?? { data: loan, error: null } },
    fetchLatest: async () => { calls.fetchLatest++; return over.fetchLatest ?? { data: stored, error: null } },
  }
  return { d, calls }
}

describe('saveMortgageDetails — server refusals keep the form (B-1)', () => {
  it('future statement date (22023): not saved, actionable message, no update attempted, loan record kept', async () => {
    const { d, calls } = deps({ reset: { data: null, error: { code: '22023', message: "A statement date can't be in the future." } } })
    const r = await saveMortgageDetails(d, loan, input({ current_balance: '148900', balance_statement_date: '2099-01-01' }))
    expect(r.ok).toBe(false)
    expect(r.error).toBe("A statement date can't be in the future. Nothing was saved; your entries are still in the form.")
    expect(r.details).toBeUndefined()
    expect(calls.update).toBe(0)
    expect(calls.reset[0]).toMatchObject({ mortgageId: 'loan-1', principal: 148900, principalVersion: 6, escrow: null, escrowVersion: null, statementDate: '2099-01-01' })
  })

  it('balance changed since the form opened (ZM5M5): shows the stored figures and adopts the stored record', async () => {
    const { d, calls } = deps({ reset: { data: null, error: { code: 'ZM5M5', message: 'The balance changed since you opened this form. Nothing was saved.' } } })
    const r = await saveMortgageDetails(d, loan, input({ current_balance: '148900' }))
    expect(r.ok).toBe(false)
    expect(r.details).toEqual(stored)
    expect(r.error).toContain('Current balance: 148500.00; escrow: 1000.00.')
    expect(calls.fetchLatest).toBe(1)
    expect(calls.update).toBe(0)
  })

  it('ZM5M5 when the latest figures cannot be read: still refused with the server message', async () => {
    const { d } = deps({
      reset: { data: null, error: { code: 'ZM5M5', message: 'The balance changed since you opened this form.' } },
      fetchLatest: { data: null, error: { message: 'network' } },
    })
    const r = await saveMortgageDetails(d, loan, input({ current_balance: '148900' }))
    expect(r).toEqual({ ok: false, error: 'The balance changed since you opened this form.' })
  })

  it('out-of-date page refusal (ZM5M6) and other server messages pass through with the not-saved note', async () => {
    const { d } = deps({ reset: { data: null, error: { code: 'ZM5M6', message: "This page is out of date and can't change the mortgage balance." } } })
    const r = await saveMortgageDetails(d, loan, input({ escrow_balance: '900' }))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/^This page is out of date.*Nothing was saved; your entries are still in the form\.$/)
  })

  it('simultaneous change (40P01): friendly retry message, not the raw deadlock text', async () => {
    const { d } = deps({ reset: { data: null, error: { code: '40P01', message: 'deadlock detected' } } })
    const r = await saveMortgageDetails(d, loan, input({ current_balance: '148900' }))
    expect(r.error).toContain('Changed at the same time somewhere else, so nothing was saved. Try again.')
    expect(r.error).not.toContain('deadlock')
  })

})

// Partial save: the balance update committed, then the ordinary details update failed. The message must say the
// balance was saved and only the other details failed — never "nothing was saved" (T3, 3407d42).
describe('saveMortgageDetails — partial save (balance committed, details failed)', () => {
  const committed: MortgageDetails = { ...loan, current_balance: '148900.00', principal_version: 7 }

  it('details refused: says the balance was saved and only the details failed, adopts the stored record', async () => {
    const { d, calls } = deps({
      update: { data: null, error: { code: '23514', message: 'Interest rate must be between 0 and 100.' } },
      fetchLatest: { data: committed, error: null },
    })
    const r = await saveMortgageDetails(d, loan, input({ current_balance: '148900', interest_rate: '400' }))
    expect(r.ok).toBe(false)
    expect(r.error).toBe(
      'The balance was saved. Only the other loan details were not saved, because Interest rate must be between 0 and 100. Your entries are still in the form; save again to apply them.',
    )
    expect(r.details).toEqual(committed)
    expect(calls.fetchLatest).toBe(1)
  })

  for (const code of ['40P01', '40001']) {
    it(`simultaneous change on the details update (${code}): no contradictory "nothing was saved"`, async () => {
      const { d } = deps({
        update: { data: null, error: { code, message: code === '40P01' ? 'deadlock detected' : 'could not serialize access' } },
        fetchLatest: { data: committed, error: null },
      })
      const r = await saveMortgageDetails(d, loan, input({ current_balance: '148900', lender_name: 'Other' }))
      expect(r.error).toBe(
        'The balance was saved. Only the other loan details were not saved, because they were changed at the same time somewhere else. Your entries are still in the form; save again to apply them.',
      )
      expect(r.error).not.toMatch(/nothing was saved|deadlock|serialize/i)
    })
  }

  it('retry after adopting the partially saved record: no second balance update, details once, no review causes resolved', async () => {
    const retryInput = input({ current_balance: '148900', lender_name: 'Other' })
    const first = deps({ update: { data: null, error: { code: '40P01', message: 'deadlock detected' } }, fetchLatest: { data: committed, error: null } })
    const r1 = await saveMortgageDetails(first.d, loan, retryInput)
    expect(first.calls.reset).toHaveLength(1)
    // an edit-path balance update never resolves review causes (only the Action Queue passes the ids it displayed)
    expect(first.calls.reset[0].resolveCauseIds).toBeUndefined()

    const retry = deps({ update: { data: { ...committed, lender_name: 'Other' }, error: null } })
    const r2 = await saveMortgageDetails(retry.d, r1.details!, retryInput)
    expect(r2).toEqual({ ok: true, error: null, details: { ...committed, lender_name: 'Other' } })
    expect(retry.calls.reset).toHaveLength(0)
    expect(retry.calls.update).toBe(1)
    expect(retry.calls.fetchLatest).toBe(0)
  })
})

describe('isSimultaneousChange / friendlyDatabaseError', () => {
  it('treats 40P01 and 40001 alike and nothing else', () => {
    expect(isSimultaneousChange({ code: '40P01' })).toBe(true)
    expect(isSimultaneousChange({ code: '40001' })).toBe(true)
    expect(isSimultaneousChange({ code: '23514' })).toBe(false)
    expect(isSimultaneousChange({})).toBe(false)
    expect(friendlyDatabaseError({ code: '40001', message: 'could not serialize access' })).toBe(
      'Changed at the same time somewhere else, so nothing was saved. Try again.',
    )
  })
})

describe('saveMortgageDetails — existing error handling keeps working', () => {
  it('blank escrow on a loan that has escrow: refused before any request', async () => {
    const { d, calls } = deps()
    const r = await saveMortgageDetails(d, loan, input({ escrow_balance: null }))
    expect(r).toEqual({ ok: false, error: 'To show that there is no escrow money, enter 0.00 rather than leaving escrow blank.' })
    expect(calls.reset.length + calls.update + calls.fetchLatest).toBe(0)
  })

  it('details-only save refused: message with the not-saved note, no balance reset, record kept', async () => {
    const { d, calls } = deps({ update: { data: null, error: { message: 'new row violates check constraint' } } })
    const r = await saveMortgageDetails(d, loan, input({ lender_name: 'Other' }))
    expect(r).toEqual({ ok: false, error: 'new row violates check constraint Nothing was saved; your entries are still in the form.' })
    expect(calls.reset).toHaveLength(0)
    expect(calls.fetchLatest).toBe(0)
  })

  it('creating a loan refused: not saved, message, no record', async () => {
    const { d } = deps({ create: { data: null, error: { code: '22023', message: "A statement date can't be in the future." } } })
    const r = await saveMortgageDetails(d, null, input({ balance_statement_date: '2099-01-01' }))
    expect(r).toEqual({ ok: false, error: "A statement date can't be in the future. Nothing was saved; your entries are still in the form." })
  })

  it('successful saves return the saved record (create, details only, balance + details)', async () => {
    expect(await saveMortgageDetails(deps().d, null, input())).toEqual({ ok: true, error: null, details: loan })
    const only = deps()
    expect(await saveMortgageDetails(only.d, loan, input({ lender_name: 'Other' }))).toEqual({ ok: true, error: null, details: loan })
    expect(only.calls.reset).toHaveLength(0)
    const both = deps()
    expect((await saveMortgageDetails(both.d, loan, input({ current_balance: '148900' }))).ok).toBe(true)
    expect(both.calls.reset).toHaveLength(1)
    expect(both.calls.update).toBe(1)
  })
})
