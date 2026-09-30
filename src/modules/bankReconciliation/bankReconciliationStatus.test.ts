import { describe, expect, it, vi } from 'vitest'
import {
  INITIAL_RECONCILIATION_STATUS,
  reconciliationStatusReducer,
  reloadEvent,
  saveThenReload,
  type ReconciliationEvent,
  type ReconciliationStatus,
  type ReloadOutcome,
  type SaveOutcome,
} from './bankReconciliationStatus'

// Lifecycle of a reconciliation save as the hook runs it: saveThenReload
// with a reducer-backed dispatch, then any later filter-triggered reload
// dispatching its own outcome through the same reducer.
function screen(initial: ReconciliationStatus = INITIAL_RECONCILIATION_STATUS) {
  let state = initial
  const dispatch = (e: ReconciliationEvent) => {
    state = reconciliationStatusReducer(state, e)
  }
  return { dispatch, get: () => state }
}
const saveOk = (updatedIds: string[]) => async (): Promise<SaveOutcome> => ({ updatedIds, error: null })
const saveErr = (message: string) => async (): Promise<SaveOutcome> => ({ updatedIds: null, error: message })
const reloadOk = async (): Promise<ReloadOutcome> => ({ error: null })
const reloadErr = (message: string) => async (): Promise<ReloadOutcome> => ({ error: message })
// The hook's filter-triggered reload: loadList().then((o) => dispatch(reloadEvent(o))).
const filterRefresh = (s: ReturnType<typeof screen>, outcome: ReloadOutcome) => s.dispatch(reloadEvent(outcome))

describe('reconciliation save lifecycle', () => {
  it('save failure: shows the error, nothing else, and does not reload', async () => {
    const s = screen()
    const reload = vi.fn(reloadOk)
    await saveThenReload(['a', 'b'], saveErr('permission denied'), reload, s.dispatch)
    expect(s.get()).toEqual({ error: 'permission denied', saveNotice: null, listStale: false })
    expect(reload).not.toHaveBeenCalled()
  })

  it('save and reload succeed, nothing skipped: nothing to report', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a', 'b']), reloadOk, s.dispatch)
    expect(s.get()).toEqual({ error: null, saveNotice: null, listStale: false })
  })

  it('save and reload succeed, one entry skipped: the save result survives the reload', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), reloadOk, s.dispatch)
    expect(s.get().saveNotice).toMatch(/^1 selected transaction was not marked as matched/)
    expect(s.get().error).toBeNull()
    expect(s.get().listStale).toBe(false)
  })

  it('reload fails after a save that skipped an entry: BOTH outcomes shown, list marked out of date', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), reloadErr('network error'), s.dispatch)
    expect(s.get().saveNotice).toMatch(/^1 selected transaction was not marked as matched/)
    expect(s.get().error).toBe('network error')
    expect(s.get().listStale).toBe(true)
  })

  it('reload fails after a save with nothing skipped: error shown, list marked out of date', async () => {
    const s = screen()
    await saveThenReload(['a'], saveOk(['a']), reloadErr('network error'), s.dispatch)
    expect(s.get()).toEqual({ error: 'network error', saveNotice: null, listStale: true })
  })

  it('a later filter-triggered refresh never erases an unacknowledged save result', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), reloadOk, s.dispatch)
    filterRefresh(s, { error: null })
    filterRefresh(s, { error: 'timeout' })
    filterRefresh(s, { error: null })
    expect(s.get().saveNotice).toMatch(/^1 selected transaction was not marked as matched/)
    expect(s.get().error).toBeNull()
    expect(s.get().listStale).toBe(false)
  })

  it('a successful refresh clears an earlier reload failure and the out-of-date mark', async () => {
    const s = screen()
    await saveThenReload(['a'], saveOk(['a']), reloadErr('network error'), s.dispatch)
    filterRefresh(s, { error: null })
    expect(s.get()).toEqual({ error: null, saveNotice: null, listStale: false })
  })

  it('the owner dismisses the save result; a newer save replaces it', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), reloadOk, s.dispatch)
    s.dispatch({ type: 'noticeDismissed' })
    expect(s.get().saveNotice).toBeNull()
    await saveThenReload(['c', 'd', 'e'], saveOk([]), reloadOk, s.dispatch)
    expect(s.get().saveNotice).toMatch(/^3 selected transactions were not marked as matched/)
  })

  it('a failed save keeps the previous, unacknowledged save result', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), reloadOk, s.dispatch)
    await saveThenReload(['c'], saveErr('permission denied'), reloadOk, s.dispatch)
    expect(s.get().saveNotice).toMatch(/^1 selected transaction was not marked as matched/)
    expect(s.get().error).toBe('permission denied')
  })
})
