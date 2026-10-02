import { describe, expect, it } from 'vitest'
import {
  duplicatePromptMessage,
  effectiveHistoryOnly,
  historyChoice,
  historyRowNote,
  listRowNote,
  parseDuplicateCounts,
  saveMortgageEntry,
} from './mortgageHistoryEntry'

// Option B (H2) decisions; the database enforces the same rules (supabase/tests/mortgage_history/run.sh).
const detail = (loan: number, history: number, unlinked: number) =>
  JSON.stringify({ loan, history, unlinked, total: loan + history + unlinked })

describe('historyChoice / effectiveHistoryOnly (contract rule 1)', () => {
  it('no statement date: unavailable, with the reason', () => {
    const c = historyChoice('2026-08-01', null)
    expect(c.kind).toBe('unavailable')
    expect(c.kind === 'unavailable' && c.reason).toMatch(/set the statement date/)
  })
  it('on or before the statement date: available; after it: not eligible', () => {
    expect(historyChoice('2026-09-01', '2026-09-01').kind).toBe('available')
    expect(historyChoice('2026-08-31', '2026-09-01').kind).toBe('available')
    expect(historyChoice('2026-09-02', '2026-09-01').kind).toBe('not_eligible')
  })
  it('saves as history only when offered AND selected (never silently)', () => {
    expect(effectiveHistoryOnly('2026-08-01', '2026-09-01', true)).toBe(true)
    expect(effectiveHistoryOnly('2026-08-01', '2026-09-01', false)).toBe(false)
    expect(effectiveHistoryOnly('2026-09-02', '2026-09-01', true)).toBe(false) // date moved past the statement date
    expect(effectiveHistoryOnly('2026-08-01', null, true)).toBe(false)
  })
})

describe('duplicate refusal parsing and wording (contract rule 5)', () => {
  it('reads the per-source counts from the database detail', () => {
    expect(parseDuplicateCounts({ code: 'ZM5MA', message: 'x', details: detail(1, 1, 0) })).toEqual({ loan: 1, history: 1, unlinked: 0, total: 2 })
  })
  it('ignores other codes and malformed details', () => {
    expect(parseDuplicateCounts({ code: '23514', message: 'x', details: detail(1, 0, 0) })).toBeNull()
    expect(parseDuplicateCounts({ code: 'ZM5MA', message: 'x', details: 'not json' })).toBeNull()
    expect(parseDuplicateCounts({ code: 'ZM5MA', message: 'x', details: detail(0, 0, 0) })).toBeNull()
  })
  it('names only the sources that matched', () => {
    expect(duplicatePromptMessage('2026-08-10', { loan: 0, history: 1, unlinked: 2, total: 3 })).toBe(
      'An identical entry already exists for 2026-08-10 (1 already in its opening-balance history, 2 earlier, not linked to a loan). Nothing was saved. If this is a separate payment, choose "Record anyway"; otherwise cancel.',
    )
  })
})

describe('saveMortgageEntry', () => {
  const ins = (error: { code?: string; message: string; details?: string } | null) => {
    const acks: Array<number | null> = []
    return { acks, insert: (a: number | null) => { acks.push(a); return Promise.resolve({ error }) } }
  }
  it('saved', async () => {
    expect(await saveMortgageEntry(ins(null).insert, '2026-08-10', null)).toEqual({ kind: 'saved' })
  })
  it('first duplicate refusal -> prompt with the total to confirm', async () => {
    const r = await saveMortgageEntry(ins({ code: 'ZM5MA', message: 'srv', details: detail(1, 0, 0) }).insert, '2026-08-10', null)
    expect(r.kind).toBe('duplicate')
    expect(r.kind === 'duplicate' && r.counts.total).toBe(1)
  })
  it('override passes the confirmed count; a changed count prompts again and says so', async () => {
    const i = ins({ code: 'ZM5MA', message: 'srv', details: detail(2, 0, 0) })
    const r = await saveMortgageEntry(i.insert, '2026-08-10', 1)
    expect(i.acks).toEqual([1])
    expect(r.kind === 'duplicate' && r.message).toMatch(/^The number of identical entries changed while you were confirming\. /)
    expect(r.kind === 'duplicate' && r.counts.total).toBe(2)
  })
  it('ZM5MB (nothing matches any more) -> save again normally', async () => {
    const r = await saveMortgageEntry(ins({ code: 'ZM5MB', message: 'srv' }).insert, '2026-08-10', 1)
    expect(r).toEqual({ kind: 'error', message: "The matching entry is no longer active, so this isn't a duplicate now. Nothing was saved; your entries are still in the form. Submit them again to record the entry normally." })
  })
  it('ZM5MC (history not eligible) -> the database explanation, values kept', async () => {
    const r = await saveMortgageEntry(ins({ code: 'ZM5MC', message: 'Set the statement date for this balance first.' }).insert, '2026-08-10', null)
    expect(r).toEqual({ kind: 'error', message: 'Set the statement date for this balance first. Nothing was saved; your entries are still in the form.' })
  })
  it('40P01 -> the friendly retry text only (no doubled "nothing was saved")', async () => {
    const r = await saveMortgageEntry(ins({ code: '40P01', message: 'deadlock detected' }).insert, '2026-08-10', null)
    expect(r).toEqual({ kind: 'error', message: 'Changed at the same time somewhere else, so nothing was saved. Try again.' })
  })
})

describe('historyRowNote', () => {
  it('labels active and voided history rows', () => {
    expect(historyRowNote(false)).toBe('Included in the opening balance.')
    expect(historyRowNote(true)).toBe('History only; balance not affected.')
  })
})

describe('listRowNote', () => {
  it('explains history rows, voided normal rows with an outcome note, and nothing else', () => {
    expect(listRowNote({ history: true, voided: false, void_outcome: null })).toBe('Included in the opening balance.')
    expect(listRowNote({ history: true, voided: true, void_outcome: null })).toBe('History only; balance not affected.')
    expect(listRowNote({ voided: true, void_outcome: 'skipped_reset_after_entry' })).toBe(
      'Balance not adjusted: it was reset after this entry. Check it against your statement.',
    )
    expect(listRowNote({ voided: false, void_outcome: null })).toBeNull()
  })
})
