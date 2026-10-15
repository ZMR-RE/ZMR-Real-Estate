// oxlint-disable react-hooks/rules-of-hooks -- deterministic hook runner uses mocked React state, not a browser render.
import { beforeEach, expect, it, vi } from 'vitest'
// Exercise the actual profile hook across tab entry, async reads and cleanup.
const h = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => unknown)[], docs: vi.fn(), account: 'practice' }))
vi.mock('react', () => ({
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => unknown) => { h.effects.push(fn) },
  useState: (initial: unknown) => { const i = h.cursor++; if (!(i in h.slots)) h.slots[i] = initial; return [h.slots[i], (next: unknown) => { h.slots[i] = typeof next === 'function' ? next(h.slots[i]) : next }] },
}))
vi.mock('../../shared/auth/AuthContext', () => ({ useAuth: () => ({ accountId: h.account }) }))
vi.mock('../llcs/useLlcs', () => ({ useLlcs: () => ({ llcOptions: [], addLlc: vi.fn() }) }))
vi.mock('../holdingCompanies/useHoldingCompanies', () => ({ useHoldingCompanies: () => ({ holdingCompanyOptions: [], addHoldingCompany: vi.fn() }) }))
vi.mock('./propertiesQueries', () => ({ listProperties: vi.fn(), updateProperty: vi.fn() }))
vi.mock('../financials/financialsQueries', () => ({ listTransactions: vi.fn() }))
vi.mock('../capture/captureQueries', () => ({ listActivityLog: vi.fn() }))
vi.mock('../propertyValueHistory/propertyValueHistoryQueries', () => ({ getLatestValue: vi.fn() }))
vi.mock('../documents/documentsQueries', () => ({ listDocuments: h.docs, getDocumentSignedUrl: vi.fn() }))
import { usePropertyProfile } from './usePropertyProfile'
function render(property = 'fixture') { h.cursor = 0; h.effects = []; return usePropertyProfile(property) }
function enterDocuments() { render().setTab('documents'); render(); return h.effects[0]() as (() => void) | undefined }
async function settle() { await Promise.resolve(); await Promise.resolve() }
beforeEach(() => { h.slots = []; h.account = 'practice'; h.docs.mockReset() })
it('reopening Documents fetches newly uploaded files and the canonical renamed label', async () => {
  h.docs.mockResolvedValueOnce({ data: [{ id: 'a', label: 'Before' }], error: null }); enterDocuments(); await settle()
  expect(render().documents).toEqual([{ id: 'a', label: 'Before' }])
  render().setTab('mortgage'); render()
  h.docs.mockResolvedValueOnce({ data: [{ id: 'a', label: 'Renamed in Mortgage' }, { id: 'b', label: 'New upload' }], error: null })
  enterDocuments(); await settle()
  expect(render().documents).toEqual([{ id: 'a', label: 'Renamed in Mortgage' }, { id: 'b', label: 'New upload' }])
  expect(h.docs).toHaveBeenLastCalledWith('practice', 'fixture')
})
it('a failed refresh is visible and does not replace saved documents with an empty list', async () => {
  h.docs.mockResolvedValueOnce({ data: [{ id: 'a' }], error: null }); enterDocuments(); await settle()
  h.docs.mockResolvedValueOnce({ data: null, error: { message: 'Read refused' } }); enterDocuments(); await settle()
  expect(render().documents).toEqual([{ id: 'a' }]); expect(render().error).toBe('Read refused')
  h.docs.mockResolvedValueOnce({ data: [{ id: 'a', label: 'Recovered' }], error: null }); enterDocuments(); await settle()
  expect(render().error).toBeNull(); expect(render().documents).toEqual([{ id: 'a', label: 'Recovered' }])
})
it('a late result from a closed tab cannot overwrite the current document snapshot', async () => {
  let resolve!: (v: unknown) => void; h.docs.mockReturnValue(new Promise(r => { resolve = r }))
  const cleanup = enterDocuments(); cleanup!(); resolve({ data: [{ id: 'stale' }], error: null }); await settle()
  expect(render().documents).toEqual([])
})
