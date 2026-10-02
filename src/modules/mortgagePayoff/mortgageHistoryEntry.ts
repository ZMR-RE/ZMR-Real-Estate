// Option B (H2): pure decisions for recording mortgage entries with the history-only choice and the duplicate rule
// (no React, no Supabase — the hooks inject the queries). Contract v5 rules 1, 5 and 7.
import { friendlyDatabaseError, isSimultaneousChange } from './mortgageBalanceIntegrity'

type DbError = { code?: string | null; message: string; details?: string | null }
type Result = { error: DbError | null }

export type HistoryChoice =
  | { kind: 'available' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'not_eligible' }

// When the form may offer "already included in my opening balance (history only)".
export function historyChoice(entryDate: string, statementDate: string | null | undefined): HistoryChoice {
  if (!statementDate) {
    return { kind: 'unavailable', reason: 'To record history, first set the statement date for this balance (Edit mortgage details).' }
  }
  if (!entryDate || entryDate > statementDate) return { kind: 'not_eligible' }
  return { kind: 'available' }
}

// Whether a form should save as history: only when the choice is offered AND selected.
export function effectiveHistoryOnly(entryDate: string, statementDate: string | null | undefined, selected: boolean): boolean {
  return selected && historyChoice(entryDate, statementDate).kind === 'available'
}

// Row label for a history entry in the payment / escrow lists.
export function historyRowNote(voided: boolean): string {
  return voided ? 'History only, so the balance was not affected.' : 'History · included in opening balance'
}

export interface DuplicateCounts {
  loan: number
  history: number
  unlinked: number
  total: number
}

export function parseDuplicateCounts(error: DbError | null): DuplicateCounts | null {
  if (!error || error.code !== 'ZM5MA' || !error.details) return null
  try {
    const d = JSON.parse(error.details) as Partial<DuplicateCounts>
    if (typeof d.total !== 'number' || d.total < 1) return null
    return { loan: d.loan ?? 0, history: d.history ?? 0, unlinked: d.unlinked ?? 0, total: d.total }
  } catch {
    return null
  }
}

export function duplicatePromptMessage(date: string, c: DuplicateCounts): string {
  const parts = [
    c.loan ? `${c.loan} on this loan` : null,
    c.history ? `${c.history} already in its opening-balance history` : null,
    c.unlinked ? `${c.unlinked} earlier, not linked to a loan` : null,
  ].filter(Boolean)
  return `An identical entry already exists for ${date} (${parts.join(', ')}). Nothing was saved. If this is a separate payment, choose "Record anyway"; otherwise cancel.`
}

export type SaveOutcome =
  | { kind: 'saved' }
  | { kind: 'duplicate'; counts: DuplicateCounts; message: string }
  | { kind: 'error'; message: string }

// One save attempt. ack = the total the user confirmed via "Record anyway" (null on a first attempt).
export async function saveMortgageEntry(insert: (ack: number | null) => PromiseLike<Result>, date: string, ack: number | null): Promise<SaveOutcome> {
  const { error } = await insert(ack)
  if (!error) return { kind: 'saved' }
  const counts = parseDuplicateCounts(error)
  if (counts) {
    // first refusal, or the count changed while confirming (the database recounts under the loan lock)
    const changed = ack !== null ? `The number of identical entries changed while you were confirming. ` : ''
    return { kind: 'duplicate', counts, message: changed + duplicatePromptMessage(date, counts) }
  }
  if (error.code === 'ZM5MB') {
    return { kind: 'error', message: 'The matching entry is no longer active, so this isn\'t a duplicate now. Nothing was saved; choose Save again to record it normally.' }
  }
  // ZM5MC (history not eligible) and the rest: the database's own explanation, or the friendly retry text.
  if (isSimultaneousChange(error)) return { kind: 'error', message: friendlyDatabaseError(error) }  // already says nothing was saved
  return { kind: 'error', message: `${error.message} Nothing was saved; your entries are still in the form.` }
}
