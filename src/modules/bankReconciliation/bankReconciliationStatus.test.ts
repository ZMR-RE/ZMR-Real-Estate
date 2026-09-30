import { describe, expect, it, vi } from 'vitest'
import {
  createLatestLoadGate,
  INITIAL_RECONCILIATION_STATUS,
  isDefiniteRefusal,
  loadLatest,
  reconciliationStatusReducer,
  reloadEvent,
  saveThenReload,
  UNCONFIRMED_SAVE_UNRESOLVED,
  type ReconciliationEvent,
  type ReloadOutcome,
  type SaveError,
  type SaveOutcome,
} from './bankReconciliationStatus'

// Lifecycle of a reconciliation save as the hook runs it: saveThenReload
// and loadLatest with a reducer-backed dispatch; the hook's filter-
// triggered reload is loadList().then((o) => reloadEvent(o) && dispatch(…)).
function screen() {
  let state = INITIAL_RECONCILIATION_STATUS
  const dispatch = (e: ReconciliationEvent) => {
    state = reconciliationStatusReducer(state, e)
  }
  return { dispatch, get: () => state }
}
const saveOk = (updatedIds: string[]) => async (): Promise<SaveOutcome> => ({ updatedIds, error: null })
const saveErr = (error: SaveError) => async (): Promise<SaveOutcome> => ({ updatedIds: null, error })
const refused: SaveError = { message: 'permission denied', code: '42501', status: 403 }
const networkDown: SaveError = { message: 'TypeError: Failed to fetch', code: '', status: 0 }
const loaded = (reconciledIds: string[] = []) => async (): Promise<ReloadOutcome> => ({ status: 'loaded', reconciledIds })
const failed = (error: string) => async (): Promise<ReloadOutcome> => ({ status: 'failed', error })
const superseded = async (): Promise<ReloadOutcome> => ({ status: 'superseded' })
const filterRefresh = (s: ReturnType<typeof screen>, outcome: ReloadOutcome) => {
  const event = reloadEvent(outcome)
  if (event) s.dispatch(event)
}
const SHORTFALL_1 = /1 selected transaction was not marked as matched/

describe('which save errors are definite', () => {
  it('a database-reported error (SQLSTATE / PostgREST code) or a 4xx means nothing was recorded', () => {
    expect(isDefiniteRefusal(refused)).toBe(true)
    expect(isDefiniteRefusal({ message: 'x', code: 'ZM092', status: 400 })).toBe(true)
    expect(isDefiniteRefusal({ message: 'timeout', code: '57014', status: 500 })).toBe(true)
    expect(isDefiniteRefusal({ message: 'x', code: 'PGRST116', status: 406 })).toBe(true)
    expect(isDefiniteRefusal({ message: 'bad request', code: '', status: 400 })).toBe(true)
  })

  it('a network failure or a gateway error without a database code is uncertain', () => {
    expect(isDefiniteRefusal(networkDown)).toBe(false)
    expect(isDefiniteRefusal({ message: 'Gateway Timeout', code: '', status: 504 })).toBe(false)
    expect(isDefiniteRefusal({ message: 'Bad Gateway', status: 502 })).toBe(false)
  })
})

describe('reconciliation save lifecycle', () => {
  it('definite save failure: shows the error, nothing else, and does not reload', async () => {
    const s = screen()
    const reload = vi.fn(loaded())
    await saveThenReload(['a', 'b'], saveErr(refused), reload, s.dispatch)
    expect(s.get()).toEqual({ error: 'permission denied', saveNotice: null, listStale: false })
    expect(reload).not.toHaveBeenCalled()
  })

  it('save and reload succeed, nothing skipped: nothing to report', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a', 'b']), loaded(['a', 'b']), s.dispatch)
    expect(s.get()).toEqual({ error: null, saveNotice: null, listStale: false })
  })

  it('save and reload succeed, one entry skipped: the save result survives the reload', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), loaded(['a']), s.dispatch)
    expect(s.get().saveNotice).toMatch(SHORTFALL_1)
    expect(s.get().error).toBeNull()
    expect(s.get().listStale).toBe(false)
  })

  it('reload fails after a save that skipped an entry: BOTH outcomes shown, list marked out of date', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), failed('network error'), s.dispatch)
    expect(s.get().saveNotice).toMatch(SHORTFALL_1)
    expect(s.get().error).toBe('network error')
    expect(s.get().listStale).toBe(true)
  })

  it('reload fails after a save with nothing skipped: error shown, list marked out of date', async () => {
    const s = screen()
    await saveThenReload(['a'], saveOk(['a']), failed('network error'), s.dispatch)
    expect(s.get()).toEqual({ error: 'network error', saveNotice: null, listStale: true })
  })

  it('a later filter-triggered refresh never erases an unacknowledged save result', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), loaded(['a']), s.dispatch)
    filterRefresh(s, { status: 'loaded', reconciledIds: [] })
    filterRefresh(s, { status: 'failed', error: 'timeout' })
    filterRefresh(s, { status: 'loaded', reconciledIds: [] })
    expect(s.get().saveNotice).toMatch(SHORTFALL_1)
    expect(s.get()).toMatchObject({ error: null, listStale: false })
  })

  it('a successful refresh clears an earlier reload failure and the out-of-date mark', async () => {
    const s = screen()
    await saveThenReload(['a'], saveOk(['a']), failed('network error'), s.dispatch)
    filterRefresh(s, { status: 'loaded', reconciledIds: ['a'] })
    expect(s.get()).toEqual({ error: null, saveNotice: null, listStale: false })
  })

  it('the owner dismisses the save result; a newer save replaces it; a refused save keeps it', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), loaded(['a']), s.dispatch)
    await saveThenReload(['c'], saveErr(refused), loaded(), s.dispatch)
    expect(s.get().saveNotice).toMatch(SHORTFALL_1)
    s.dispatch({ type: 'noticeDismissed' })
    expect(s.get().saveNotice).toBeNull()
    await saveThenReload(['c', 'd', 'e'], saveOk([]), loaded(), s.dispatch)
    expect(s.get().saveNotice).toMatch(/3 selected transactions were not marked as matched/)
  })
})

describe('uncertain save outcomes are verified, never assumed', () => {
  it('network failure, but everything was recorded: says so after checking', async () => {
    const s = screen()
    const reload = vi.fn(loaded(['a', 'b']))
    await saveThenReload(['a', 'b'], saveErr(networkDown), reload, s.dispatch)
    expect(reload).toHaveBeenCalledOnce()
    expect(s.get().saveNotice).toBe(
      'The save could not be confirmed at first. After checking, all 2 selected transactions are marked as matched.',
    )
    expect(s.get()).toMatchObject({ error: null, listStale: false })
  })

  it('gateway timeout, partly recorded: reports exactly what the check found', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveErr({ message: 'Gateway Timeout', status: 504 }), loaded(['a']), s.dispatch)
    expect(s.get().saveNotice).toMatch(/^The save could not be confirmed at first\. After checking: 1 selected transaction was not marked/)
  })

  it('network failure and the check also fails: no claim either way, list marked out of date', async () => {
    const s = screen()
    await saveThenReload(['a'], saveErr(networkDown), failed('Failed to fetch'), s.dispatch)
    expect(s.get()).toEqual({ error: 'Failed to fetch', saveNotice: UNCONFIRMED_SAVE_UNRESOLVED, listStale: true })
  })

  it('network failure and the owner moved to another property before the check returned: no claim', async () => {
    const s = screen()
    await saveThenReload(['a'], saveErr(networkDown), superseded, s.dispatch)
    expect(s.get().saveNotice).toBe(UNCONFIRMED_SAVE_UNRESOLVED)
  })

  it('never says nothing was written for an uncertain failure', async () => {
    const s = screen()
    await saveThenReload(['a'], saveErr(networkDown), loaded([]), s.dispatch)
    expect(s.get().saveNotice).toMatch(/could not be confirmed at first/)
    expect(s.get().saveNotice).not.toBeNull()
  })
})

describe('superseded list loads never replace the current selection', () => {
  function deferred<T>() {
    let resolve!: (v: T) => void
    const promise = new Promise<T>((r) => (resolve = r))
    return { promise, resolve }
  }

  it('an older load that finishes last is ignored; the newer selection stays', async () => {
    const gate = createLatestLoadGate()
    const applied: string[] = []
    const oldFetch = deferred<{ data: string | null; error: string | null }>()
    const newFetch = deferred<{ data: string | null; error: string | null }>()
    const apply = (data: string | null) => {
      applied.push(data ?? '')
      return []
    }
    const older = loadLatest(gate, () => oldFetch.promise, apply) // property P1
    const newer = loadLatest(gate, () => newFetch.promise, apply) // owner switched to P2
    newFetch.resolve({ data: 'P2 list', error: null })
    oldFetch.resolve({ data: 'P1 list', error: null })
    expect(await newer).toEqual({ status: 'loaded', reconciledIds: [] })
    expect(await older).toEqual({ status: 'superseded' })
    expect(applied).toEqual(['P2 list'])
  })

  it('an older load that fails after a newer one succeeded does not mark the list out of date', async () => {
    const gate = createLatestLoadGate()
    const s = screen()
    const oldFetch = deferred<{ data: null; error: string | null }>()
    const older = loadLatest(gate, () => oldFetch.promise, () => [])
    const newer = loadLatest(gate, async () => ({ data: null, error: null }), () => [])
    filterRefresh(s, await newer)
    oldFetch.resolve({ data: null, error: 'timeout' })
    filterRefresh(s, await older)
    expect(s.get()).toEqual({ error: null, saveNotice: null, listStale: false })
  })

  it("a save's reload overtaken by a filter change keeps the save result and reports only the newer load", async () => {
    const gate = createLatestLoadGate()
    const s = screen()
    const saveReload = deferred<{ data: null; error: string | null }>()
    const saving = saveThenReload(['a', 'b'], saveOk(['a']), () => loadLatest(gate, () => saveReload.promise, () => []), s.dispatch)
    await Promise.resolve()
    const filterLoad = loadLatest(gate, async () => ({ data: null, error: 'P2 failed' }), () => [])
    filterRefresh(s, await filterLoad)
    saveReload.resolve({ data: null, error: null })
    await saving
    expect(s.get().saveNotice).toMatch(SHORTFALL_1)
    expect(s.get()).toMatchObject({ error: 'P2 failed', listStale: true })
  })
})
