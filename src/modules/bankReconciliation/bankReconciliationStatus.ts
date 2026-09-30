import { reconciliationShortfall } from './bankReconciliationCalculations'

// What the reconciliation screen tells the owner, kept as three separate
// facts so no outcome can overwrite another:
//   error      — the latest failure (saving, or loading the list)
//   saveNotice — the last save's own result (entries it could not match);
//                stays until the owner dismisses it or saves again, so a
//                reload triggered by changing the filters never erases it
//   listStale  — the list on screen is older than the last change because
//                it could not be reloaded
export interface ReconciliationStatus {
  error: string | null
  saveNotice: string | null
  listStale: boolean
}

export const INITIAL_RECONCILIATION_STATUS: ReconciliationStatus = { error: null, saveNotice: null, listStale: false }

export type ReconciliationEvent =
  | { type: 'saveFailed'; message: string }
  | { type: 'saved'; notice: string | null }
  | { type: 'reloadSucceeded' }
  | { type: 'reloadFailed'; message: string }
  | { type: 'noticeDismissed' }

export function reconciliationStatusReducer(state: ReconciliationStatus, event: ReconciliationEvent): ReconciliationStatus {
  switch (event.type) {
    case 'saveFailed':
      // Nothing was written, so the list on screen is still accurate.
      return { ...state, error: event.message }
    case 'saved':
      // A new save supersedes the previous save's result.
      return { ...state, error: null, saveNotice: event.notice }
    case 'reloadSucceeded':
      return { ...state, error: null, listStale: false }
    case 'reloadFailed':
      return { ...state, error: event.message, listStale: true }
    case 'noticeDismissed':
      return { ...state, saveNotice: null }
  }
}

export interface SaveOutcome {
  updatedIds: string[] | null
  error: string | null
}

export interface ReloadOutcome {
  error: string | null
}

// The one mapping from a list reload's outcome to its event, used by the
// save sequence below and by the hook's filter-triggered reload alike.
export const reloadEvent = (outcome: ReloadOutcome): ReconciliationEvent =>
  outcome.error ? { type: 'reloadFailed', message: outcome.error } : { type: 'reloadSucceeded' }

// The exact sequence the hook runs when the owner saves a reconciliation:
// save, record the save's own result, then reload the list and record
// whether that worked. Each outcome is its own event, so a reload (failed
// or not) never replaces the save result, and vice versa.
export async function saveThenReload(
  requestedIds: string[],
  save: () => Promise<SaveOutcome>,
  reload: () => Promise<ReloadOutcome>,
  dispatch: (event: ReconciliationEvent) => void,
): Promise<void> {
  const saved = await save()
  if (saved.error) {
    dispatch({ type: 'saveFailed', message: saved.error })
    return
  }
  dispatch({ type: 'saved', notice: reconciliationShortfall(requestedIds, saved.updatedIds ?? []) })
  dispatch(reloadEvent(await reload()))
}
