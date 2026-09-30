import { describe, expect, it, vi } from 'vitest'
import {
  createSelectionGate,
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
  type ListSelection,
  type SaveOutcome,
  type VerifyOutcome,
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
const checked = (reconciledIds: string[]) => async (): Promise<VerifyOutcome> => ({ status: 'checked', reconciledIds })
const checkFailed = (error: string) => async (): Promise<VerifyOutcome> => ({ status: 'failed', error })
const noVerify = async (): Promise<VerifyOutcome> => {
  throw new Error('verification must not run for a definite outcome')
}
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
    await saveThenReload(['a', 'b'], saveErr(refused), noVerify, reload, s.dispatch)
    expect(s.get()).toEqual({ error: 'permission denied', saveNotice: null, listStale: false })
    expect(reload).not.toHaveBeenCalled()
  })

  it('save and reload succeed, nothing skipped: nothing to report', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a', 'b']), noVerify, loaded(['a', 'b']), s.dispatch)
    expect(s.get()).toEqual({ error: null, saveNotice: null, listStale: false })
  })

  it('save and reload succeed, one entry skipped: the save result survives the reload', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), noVerify, loaded(['a']), s.dispatch)
    expect(s.get().saveNotice).toMatch(SHORTFALL_1)
    expect(s.get().error).toBeNull()
    expect(s.get().listStale).toBe(false)
  })

  it('reload fails after a save that skipped an entry: BOTH outcomes shown, list marked out of date', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), noVerify, failed('network error'), s.dispatch)
    expect(s.get().saveNotice).toMatch(SHORTFALL_1)
    expect(s.get().error).toBe('network error')
    expect(s.get().listStale).toBe(true)
  })

  it('reload fails after a save with nothing skipped: error shown, list marked out of date', async () => {
    const s = screen()
    await saveThenReload(['a'], saveOk(['a']), noVerify, failed('network error'), s.dispatch)
    expect(s.get()).toEqual({ error: 'network error', saveNotice: null, listStale: true })
  })

  it('a later filter-triggered refresh never erases an unacknowledged save result', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), noVerify, loaded(['a']), s.dispatch)
    filterRefresh(s, { status: 'loaded', reconciledIds: [] })
    filterRefresh(s, { status: 'failed', error: 'timeout' })
    filterRefresh(s, { status: 'loaded', reconciledIds: [] })
    expect(s.get().saveNotice).toMatch(SHORTFALL_1)
    expect(s.get()).toMatchObject({ error: null, listStale: false })
  })

  it('a successful refresh clears an earlier reload failure and the out-of-date mark', async () => {
    const s = screen()
    await saveThenReload(['a'], saveOk(['a']), noVerify, failed('network error'), s.dispatch)
    filterRefresh(s, { status: 'loaded', reconciledIds: ['a'] })
    expect(s.get()).toEqual({ error: null, saveNotice: null, listStale: false })
  })

  it('the owner dismisses the save result; a newer save replaces it; a refused save keeps it', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveOk(['a']), noVerify, loaded(['a']), s.dispatch)
    await saveThenReload(['c'], saveErr(refused), noVerify, loaded(), s.dispatch)
    expect(s.get().saveNotice).toMatch(SHORTFALL_1)
    s.dispatch({ type: 'noticeDismissed' })
    expect(s.get().saveNotice).toBeNull()
    await saveThenReload(['c', 'd', 'e'], saveOk([]), noVerify, loaded(), s.dispatch)
    expect(s.get().saveNotice).toMatch(/3 selected transactions were not marked as matched/)
  })
})

describe('uncertain save outcomes are verified against the saved records, never assumed', () => {
  it('network failure, but everything was recorded: says so after checking the saved records', async () => {
    const s = screen()
    const verify = vi.fn(checked(['a', 'b']))
    await saveThenReload(['a', 'b'], saveErr(networkDown), verify, loaded(), s.dispatch)
    expect(verify).toHaveBeenCalledOnce()
    expect(s.get().saveNotice).toBe(
      'The save could not be confirmed at first. After checking, all 2 selected transactions are marked as matched.',
    )
    expect(s.get()).toMatchObject({ error: null, listStale: false })
  })

  it('gateway timeout, partly recorded: reports exactly what the check found', async () => {
    const s = screen()
    await saveThenReload(['a', 'b'], saveErr({ message: 'Gateway Timeout', status: 504 }), checked(['a']), loaded(), s.dispatch)
    expect(s.get().saveNotice).toMatch(/^The save could not be confirmed at first\. After checking: 1 selected transaction was not marked/)
  })

  it('network failure and the check fails: no claim either way; the list reload is reported separately', async () => {
    const s = screen()
    await saveThenReload(['a'], saveErr(networkDown), checkFailed('Failed to fetch'), loaded(), s.dispatch)
    expect(s.get()).toEqual({ error: null, saveNotice: UNCONFIRMED_SAVE_UNRESOLVED, listStale: false })
    const t = screen()
    await saveThenReload(['a'], saveErr(networkDown), checkFailed('Failed to fetch'), failed('Failed to fetch'), t.dispatch)
    expect(t.get()).toEqual({ error: 'Failed to fetch', saveNotice: UNCONFIRMED_SAVE_UNRESOLVED, listStale: true })
  })

  it('a failed check with a current list still shows the check failure', async () => {
    const s = screen()
    await saveThenReload(['a'], saveErr(networkDown), checkFailed('check failed'), superseded, s.dispatch)
    expect(s.get()).toEqual({ error: 'check failed', saveNotice: UNCONFIRMED_SAVE_UNRESOLVED, listStale: false })
  })

  it('never says nothing was written for an uncertain failure', async () => {
    const s = screen()
    await saveThenReload(['a'], saveErr(networkDown), checked([]), loaded(), s.dispatch)
    expect(s.get().saveNotice).toMatch(/could not be confirmed at first/)
  })
})

describe('only the current selection may populate the list', () => {
  function deferred<T>() {
    let resolve!: (v: T) => void
    const promise = new Promise<T>((r) => (resolve = r))
    return { promise, resolve }
  }
  type Fetched = { data: string | null; error: string | null }
  const P1: ListSelection = { propertyId: 'P1', periodStart: '2026-09-01', periodEnd: '2026-09-30' }
  const P2: ListSelection = { propertyId: 'P2', periodStart: '2026-09-01', periodEnd: '2026-09-30' }
  const P1_OCT: ListSelection = { ...P1, periodStart: '2026-10-01', periodEnd: '2026-10-31' }

  it("T3's ordering: save for P1 → owner selects P2 (load starts) → save finishes and starts a P1 reload → P1 is rejected", async () => {
    const gate = createSelectionGate()
    const s = screen()
    const shown: string[] = []
    const apply = (data: string | null) => {
      shown.push(data ?? '')
      return []
    }
    gate.select(P1)
    const save = deferred<SaveOutcome>()
    const p2Fetch = deferred<Fetched>()
    const p1Fetch = deferred<Fetched>()
    // 1. Save starts for P1; its reload is the P1 reload T3 reproduced
    //    (a load bound to the selection the save started with).
    const saving = saveThenReload(['a', 'b'], () => save.promise, noVerify, () => loadLatest(gate, P1, () => p1Fetch.promise, apply), s.dispatch)
    // 2. Owner selects P2; its load starts.
    gate.select(P2)
    const p2Load = loadLatest(gate, P2, () => p2Fetch.promise, apply)
    // 3. Save finishes, which starts the (later) P1 reload.
    save.resolve({ updatedIds: ['a'], error: null })
    await Promise.resolve()
    await Promise.resolve()
    // Both loads return — P1's last.
    p2Fetch.resolve({ data: 'P2 list', error: null })
    filterRefresh(s, await p2Load)
    p1Fetch.resolve({ data: 'P1 list', error: null })
    await saving
    expect(shown).toEqual(['P2 list'])
    expect(s.get().saveNotice).toMatch(SHORTFALL_1)
    expect(s.get()).toMatchObject({ error: null, listStale: false })
  })

  it('a later P1 reload that FAILS after the owner selected P2 does not mark the P2 list out of date', async () => {
    const gate = createSelectionGate()
    const s = screen()
    gate.select(P2)
    filterRefresh(s, await loadLatest(gate, P2, async () => ({ data: 'P2 list', error: null }), () => []))
    filterRefresh(s, await loadLatest(gate, P1, async () => ({ data: null, error: 'timeout' }), () => []))
    expect(s.get()).toEqual({ error: null, saveNotice: null, listStale: false })
  })

  it('an older load for the same selection that finishes last is ignored', async () => {
    const gate = createSelectionGate()
    const shown: string[] = []
    const apply = (data: string | null) => {
      shown.push(data ?? '')
      return []
    }
    gate.select(P1)
    const older = deferred<Fetched>()
    const first = loadLatest(gate, P1, () => older.promise, apply)
    const second = loadLatest(gate, P1, async () => ({ data: 'P1 newer', error: null }), apply)
    expect(await second).toEqual({ status: 'loaded', reconciledIds: [] })
    older.resolve({ data: 'P1 older', error: null })
    expect(await first).toEqual({ status: 'superseded' })
    expect(shown).toEqual(['P1 newer'])
  })

  it('a changed period counts as a different selection', async () => {
    const gate = createSelectionGate()
    const shown: string[] = []
    gate.select(P1)
    const sept = deferred<Fetched>()
    const septLoad = loadLatest(gate, P1, () => sept.promise, (d) => (shown.push(d ?? ''), []))
    gate.select(P1_OCT)
    sept.resolve({ data: 'September', error: null })
    expect(await septLoad).toEqual({ status: 'superseded' })
    expect(shown).toEqual([])
  })

  it('verification checks the ORIGINAL saved records even though the list now shows another property', async () => {
    const gate = createSelectionGate()
    const s = screen()
    const shown: string[] = []
    gate.select(P1)
    const save = deferred<SaveOutcome>()
    const verify = vi.fn(checked(['a'])) // the P1 records 'a','b' by id: only 'a' matched
    const saving = saveThenReload(
      ['a', 'b'],
      () => save.promise,
      verify,
      () => loadLatest(gate, gate.current()!, async () => ({ data: gate.current()!.propertyId, error: null }), (d) => (shown.push(d ?? ''), [])),
      s.dispatch,
    )
    gate.select(P2)
    save.resolve({ updatedIds: null, error: networkDown })
    await saving
    expect(verify).toHaveBeenCalledOnce()
    expect(s.get().saveNotice).toMatch(/^The save could not be confirmed at first\. After checking: 1 selected transaction was not marked/)
    expect(shown).toEqual(['P2']) // the reload targeted the CURRENT selection
  })
})
