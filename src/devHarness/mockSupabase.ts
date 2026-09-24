// ISOLATED MOCK — not the real Supabase client. Used only by the dev
// harness (src/devHarness/), loaded only when running `npm run
// dev:harness`, which points a SEPARATE Vite config
// (vite.harness.config.ts) at a SEPARATE HTML entry (harness.html) on a
// SEPARATE port. It is never imported by src/App.tsx or any file the
// real `npm run dev`/`npm run build` serves — grep this repo for
// "devHarness" to confirm nothing outside this folder and its own Vite
// config references it. No network call this module makes can ever
// reach the real (or any) Supabase project: there is no URL, no key, no
// fetch. All data is in-memory, seeded with obviously-fictional
// "ZMR-TEST-FIXTURE" identities, and discarded on page reload.

export interface MockRow {
  [key: string]: unknown
}

type MockResult = { data: unknown; error: unknown }

class MockQueryBuilder implements PromiseLike<MockResult> {
  private filters: ((row: MockRow) => boolean)[] = []
  private orderCol: string | null = null
  private orderAscending = true
  private orderNullsFirst = false
  private limitN: number | null = null
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: MockRow | MockRow[] | null = null
  private singleMode: 'single' | 'maybeSingle' | null = null
  private table: MockRow[]
  private onMutate?: (mode: 'insert' | 'update' | 'delete', payload: MockRow | MockRow[] | null, matched: MockRow[]) => MockRow[]
  private join?: (row: MockRow) => MockRow

  constructor(
    table: MockRow[],
    onMutate?: (mode: 'insert' | 'update' | 'delete', payload: MockRow | MockRow[] | null, matched: MockRow[]) => MockRow[],
    join?: (row: MockRow) => MockRow,
  ) {
    this.table = table
    this.onMutate = onMutate
    this.join = join
  }

  select(_cols?: string) {
    return this
  }
  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val)
    return this
  }
  in(col: string, vals: unknown[]) {
    this.filters.push((r) => vals.includes(r[col]))
    return this
  }
  gte(col: string, val: unknown) {
    this.filters.push((r) => (r[col] as string | number) >= (val as string | number))
    return this
  }
  lte(col: string, val: unknown) {
    this.filters.push((r) => (r[col] as string | number) <= (val as string | number))
    return this
  }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderCol = col
    this.orderAscending = opts?.ascending !== false
    this.orderNullsFirst = !!opts?.nullsFirst
    return this
  }
  limit(n: number) {
    this.limitN = n
    return this
  }
  single() {
    this.singleMode = 'single'
    return this
  }
  maybeSingle() {
    this.singleMode = 'maybeSingle'
    return this
  }
  returns<T>() {
    return this as unknown as MockQueryBuilder & PromiseLike<{ data: T; error: unknown }>
  }
  insert(payload: MockRow | MockRow[]) {
    this.mode = 'insert'
    this.payload = payload
    return this
  }
  update(payload: MockRow) {
    this.mode = 'update'
    this.payload = payload
    return this
  }
  delete() {
    this.mode = 'delete'
    return this
  }

  private matched() {
    return this.table.filter((r) => this.filters.every((f) => f(r)))
  }

  private computeSelectResult() {
    let result = this.matched()
    if (this.orderCol) {
      const col = this.orderCol
      result = [...result].sort((a, b) => {
        const av = a[col] as number | string | null
        const bv = b[col] as number | string | null
        if (av == null && bv == null) return 0
        if (av == null) return this.orderNullsFirst ? -1 : 1
        if (bv == null) return this.orderNullsFirst ? 1 : -1
        if (av === bv) return 0
        const cmp = av > bv ? 1 : -1
        return this.orderAscending ? cmp : -cmp
      })
    }
    if (this.limitN != null) result = result.slice(0, this.limitN)
    return result
  }

  then<TResult1 = MockResult, TResult2 = never>(
    onfulfilled?: ((value: MockResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const matchedRows = this.matched()
    let resultData: unknown
    let error: unknown = null
    // Rows handed back are copies, as a real network response would be —
    // React state must never alias the in-memory "database" row, or a
    // later write to that row (e.g. the harness's simulated other editor)
    // would silently update the caller's stale-edit token too.
    const clone = (r: MockRow): MockRow => ({ ...r })

    if (this.mode === 'insert') {
      const rowsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload as MockRow]
      const inserted = rowsToInsert.map((r) => ({ id: `mock-${Math.random().toString(36).slice(2)}`, created_at: new Date().toISOString(), ...r }))
      this.table.push(...inserted)
      this.onMutate?.('insert', this.payload, inserted)
      resultData = this.singleMode ? clone(inserted[0]) : inserted.map(clone)
    } else if (this.mode === 'update') {
      matchedRows.forEach((row) => {
        Object.assign(row, this.payload)
        // Mirror the per-table set_<table>_updated_at triggers (properties
        // included, 20260925080000): a real UPDATE always moves updated_at.
        if ('updated_at' in row) row.updated_at = new Date().toISOString()
      })
      this.onMutate?.('update', this.payload, matchedRows)
      resultData = this.singleMode ? (matchedRows[0] ? clone(matchedRows[0]) : null) : matchedRows.map(clone)
      // Mirror PostgREST: .single() on an UPDATE that matched zero rows is
      // an error (PGRST116), not a silent null — exactly the signal the
      // stale-edit guard in propertiesQueries.updateProperty relies on.
      if (this.singleMode === 'single' && matchedRows.length === 0) {
        error = { message: 'No rows found', code: 'PGRST116' }
      }
    } else if (this.mode === 'delete') {
      matchedRows.forEach((row) => {
        const idx = this.table.indexOf(row)
        if (idx >= 0) this.table.splice(idx, 1)
      })
      this.onMutate?.('delete', null, matchedRows)
      resultData = matchedRows
    } else {
      let result = this.computeSelectResult().map(clone)
      if (this.join) result = result.map((r) => this.join!(r))
      if (this.singleMode === 'single') {
        resultData = result[0] ?? null
        if (!result[0]) error = { message: 'No rows found', code: 'PGRST116' }
      } else if (this.singleMode === 'maybeSingle') {
        resultData = result[0] ?? null
      } else {
        resultData = result
      }
    }

    const settled: MockResult = { data: resultData, error }
    return Promise.resolve(settled).then(onfulfilled, onrejected)
  }
}

export interface MockDb {
  [table: string]: MockRow[]
}

export function createMockSupabaseClient(
  db: MockDb,
  rpcHandlers: Record<string, (args: Record<string, unknown>) => { data: unknown; error: unknown }>,
  joins: Record<string, (row: MockRow) => MockRow> = {},
) {
  return {
    from(table: string) {
      if (!db[table]) db[table] = []
      return new MockQueryBuilder(db[table], undefined, joins[table])
    },
    rpc(fn: string, args: Record<string, unknown>) {
      const handler = rpcHandlers[fn]
      const result = handler ? handler(args) : { data: null, error: { message: `Mock RPC not implemented: ${fn}`, code: 'MOCK_MISSING' } }
      return Promise.resolve(result) as PromiseLike<{ data: unknown; error: unknown }> & { then: typeof Promise.prototype.then }
    },
    storage: {
      from() {
        return {
          upload: async () => ({ data: null, error: { message: 'Mock storage: upload not available in this harness' } }),
          createSignedUrl: async () => ({ data: { signedUrl: '#mock-signed-url' }, error: null }),
        }
      },
    },
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: 'mock-user', email: 'zmr-test-fixture@example.test' } } },
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } }) },
      signOut: async () => ({ error: null }),
    },
  }
}
