import { reconciliationShortfall } from './bankReconciliationCalculations'

// What the reconciliation screen tells the owner, kept as separate facts so
// no outcome can overwrite another:
//   error      — the latest failure (saving, or loading the list)
//   saveNotice — the last save's own result: entries it could not match, or
//                that it could not be confirmed. Stays until the owner
//                dismisses it or saves again, so a reload triggered by
//                changing the filters never erases it
//   listStale  — the list on screen is older than the last change because
//                it could not be reloaded
export interface ReconciliationStatus {
  error: string | null
  saveNotice: string | null
  listStale: boolean
}

export const INITIAL_RECONCILIATION_STATUS: ReconciliationStatus = { error: null, saveNotice: null, listStale: false }

export const UNCONFIRMED_SAVE_CHECKING =
  'Could not confirm whether the save was recorded. Checking what the list now shows…'
export const UNCONFIRMED_SAVE_UNRESOLVED =
  'Could not confirm whether the save was recorded. Reload the list and check the selected transactions before saving again.'

export type ReconciliationEvent =
  | { type: 'saveFailed'; message: string }
  | { type: 'saveUnconfirmed'; message: string }
  | { type: 'verifyFailed'; message: string }
  | { type: 'saved'; notice: string | null }
  | { type: 'reloadSucceeded' }
  | { type: 'reloadFailed'; message: string }
  | { type: 'noticeDismissed' }

export function reconciliationStatusReducer(state: ReconciliationStatus, event: ReconciliationEvent): ReconciliationStatus {
  switch (event.type) {
    case 'saveFailed':
      // The database refused the write, so nothing was recorded and the
      // list on screen is still accurate.
      return { ...state, error: event.message }
    case 'saveUnconfirmed':
      // The request may or may not have been recorded; never claim either.
      return { ...state, error: event.message, saveNotice: UNCONFIRMED_SAVE_CHECKING }
    case 'verifyFailed':
      // Checking the saved records failed; the list itself is unaffected.
      return { ...state, error: event.message }
    case 'saved':
      // A new (or newly verified) save result supersedes the previous one.
      return { ...state, error: null, saveNotice: event.notice }
    case 'reloadSucceeded':
      return { ...state, error: null, listStale: false }
    case 'reloadFailed':
      return { ...state, error: event.message, listStale: true }
    case 'noticeDismissed':
      return { ...state, saveNotice: null }
  }
}

export interface SaveError {
  message: string
  code?: string | null
  status?: number | null
}

// A save error is DEFINITE only when the database itself refused the write
// (an SQLSTATE or PostgREST code: the statement was rolled back) or the
// request was rejected as a client error (4xx). A network failure, gateway
// timeout or other 5xx without a database code may have committed.
export function isDefiniteRefusal(error: SaveError): boolean {
  if (error.code && /^([0-9A-Z]{5}|PGRST\d+)$/.test(error.code)) return true
  return typeof error.status === 'number' && error.status >= 400 && error.status < 500
}

export interface SaveOutcome {
  updatedIds: string[] | null
  error: SaveError | null
}

// A list load either applies to the current selection, fails, or is
// ignored because it is not for the current selection or a newer load for
// that selection started after it.
export type ReloadOutcome =
  | { status: 'loaded'; reconciledIds: string[] }
  | { status: 'failed'; error: string }
  | { status: 'superseded' }

// The one mapping from a load's outcome to its event, used by the save
// sequence below and by the hook's filter-triggered reload alike. A
// superseded load reports nothing: the newer load reports its own outcome.
export const reloadEvent = (outcome: ReloadOutcome): ReconciliationEvent | null =>
  outcome.status === 'loaded'
    ? { type: 'reloadSucceeded' }
    : outcome.status === 'failed'
      ? { type: 'reloadFailed', message: outcome.error }
      : null

function verifiedNotice(requestedIds: string[], reconciledIds: string[]): string {
  const shortfall = reconciliationShortfall(requestedIds, reconciledIds)
  const n = requestedIds.length
  return shortfall
    ? `The save could not be confirmed at first. After checking: ${shortfall}`
    : `The save could not be confirmed at first. After checking, ${n === 1 ? 'the selected transaction is' : `all ${n} selected transactions are`} marked as matched.`
}

// Checking the ORIGINAL saved records by id (not whatever list is on
// screen): which of them are now matched and not voided.
export type VerifyOutcome = { status: 'checked'; reconciledIds: string[] } | { status: 'failed'; error: string }

// The exact sequence the hook runs when the owner saves a reconciliation.
// verify() checks the saved records themselves; reloadCurrent() reloads
// the list for whatever property/period is selected NOW, and its result is
// shown only if it is still current when it returns.
export async function saveThenReload(
  requestedIds: string[],
  save: () => Promise<SaveOutcome>,
  verify: () => Promise<VerifyOutcome>,
  reloadCurrent: () => Promise<ReloadOutcome>,
  dispatch: (event: ReconciliationEvent) => void,
): Promise<void> {
  const saved = await save()
  if (saved.error && isDefiniteRefusal(saved.error)) {
    dispatch({ type: 'saveFailed', message: saved.error.message })
    return
  }
  if (saved.error) {
    // Uncertain: check the saved records, independent of the list shown.
    dispatch({ type: 'saveUnconfirmed', message: saved.error.message })
    const checked = await verify()
    if (checked.status === 'checked') {
      dispatch({ type: 'saved', notice: verifiedNotice(requestedIds, checked.reconciledIds) })
    } else {
      dispatch({ type: 'saved', notice: UNCONFIRMED_SAVE_UNRESOLVED })
      dispatch({ type: 'verifyFailed', message: checked.error })
    }
  } else {
    dispatch({ type: 'saved', notice: reconciliationShortfall(requestedIds, saved.updatedIds ?? []) })
  }
  const event = reloadEvent(await reloadCurrent())
  if (event) dispatch(event)
}

// Which property and period a list load is for.
export interface ListSelection {
  propertyId: string | null
  periodStart: string
  periodEnd: string
}

export const selectionKey = (s: ListSelection) => `${s.propertyId ?? ''}|${s.periodStart}|${s.periodEnd}`

// Tracks the owner's CURRENT selection and, per selection, the newest load
// started for it. A load's result may populate the list only if it is for
// the current selection AND no newer load for that selection has started —
// so neither an older load nor a later load for a previous selection (e.g. a
// save's reload for P1 after the owner picked P2) can replace the list.
export function createSelectionGate() {
  let current: ListSelection | null = null
  let seq = 0
  const newestByKey = new Map<string, number>()
  return {
    select: (selection: ListSelection) => {
      current = selection
    },
    current: () => current,
    begin: (selection: ListSelection) => {
      const id = ++seq
      const key = selectionKey(selection)
      newestByKey.set(key, id)
      return { id, key }
    },
    isCurrent: (token: { id: number; key: string }) =>
      current !== null && token.key === selectionKey(current) && newestByKey.get(token.key) === token.id,
  }
}

// One list load as the hook runs it: take a token for the selection it is
// for, fetch, and apply the result only if it is still current.
export async function loadLatest<T>(
  gate: ReturnType<typeof createSelectionGate>,
  selection: ListSelection,
  fetch: () => Promise<{ data: T | null; error: string | null }>,
  apply: (data: T | null) => string[],
): Promise<ReloadOutcome> {
  const token = gate.begin(selection)
  const result = await fetch()
  if (!gate.isCurrent(token)) return { status: 'superseded' }
  if (result.error) return { status: 'failed', error: result.error }
  return { status: 'loaded', reconciledIds: apply(result.data) }
}
