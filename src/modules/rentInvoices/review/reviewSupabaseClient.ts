// SIMULATED BACKEND (review page only). Aliased in place of
// shared/supabaseClient by vite.rent-invoices-review.config.ts. No URL, no
// key, no network: an in-memory store seeded with fictional records, the
// harness's generic mock query builder, the invoice-action mirror
// (reviewRpc.ts) and an in-memory Storage that — like the Stage 1 Storage
// policies — refuses to overwrite an existing object.
import { createMockSupabaseClient, type MockRow } from '../../../devHarness/mockSupabase'
import { buildReviewDb } from './reviewFixtures'
import { createReviewRpc } from './reviewRpc'

export const reviewDb = buildReviewDb()
const objects = new Map<string, Blob>()
let clock = Date.parse('2026-10-28T15:00:00Z')
const now = () => new Date((clock += 60_000)).toISOString()

const byId = (table: string, id: unknown) => reviewDb[table].find((r) => r.id === id) ?? null

const joins = {
  invoices: (row: MockRow) => ({
    ...row,
    invoice_lines: reviewDb.invoice_lines.filter((l) => l.invoice_id === row.id).sort((a, b) => (a.sort_order as number) - (b.sort_order as number)),
    property: byId('properties', row.property_id),
    payments: reviewDb.payments.filter((p) => p.invoice_id === row.id),
  }),
  leases: (row: MockRow) => ({
    ...row,
    unit: byId('units', row.unit_id),
    property: byId('properties', row.property_id),
    lease_tenants: reviewDb.lease_tenants.filter((lt) => lt.lease_id === row.id).map((lt) => ({ ...lt, tenant: byId('tenants', lt.tenant_id) })),
  }),
}

const rpc = createReviewRpc(reviewDb, now)
const base = createMockSupabaseClient(reviewDb, rpc, joins)

export const supabase = {
  ...base,
  storage: {
    from: () => ({
      upload: async (path: string, file: Blob) => {
        if (objects.has(path)) return { data: null, error: { message: 'The resource already exists (stored invoice PDFs are never overwritten).' } }
        objects.set(path, file)
        return { data: { path }, error: null }
      },
      download: async (path: string) => {
        const file = objects.get(path)
        return file ? { data: file, error: null } : { data: null, error: { message: 'Object not found' } }
      },
      createSignedUrl: async () => ({ data: { signedUrl: '#simulated' }, error: null }),
    }),
  },
}
