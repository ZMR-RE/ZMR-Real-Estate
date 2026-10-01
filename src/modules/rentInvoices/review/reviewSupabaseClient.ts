// SIMULATED BACKEND (review page only). Aliased in place of
// shared/supabaseClient by vite.rent-invoices-review.config.ts. No URL, no
// key, no network: an in-memory store seeded with fictional records, the
// harness's generic mock query builder, the invoice-action mirror
// (reviewRpc.ts) and an in-memory Storage that — like the Stage 1 Storage
// policies — refuses to overwrite an existing object.
//
// ?fail-upload=1 makes the NEXT invoice-PDF upload fail once, to check the
// visible "Store PDF" retry after issue (release verification item).
import { createMockSupabaseClient, type MockRow } from '../../../devHarness/mockSupabase'
import { SAMPLE_LOGO } from '../../entityBranding/review/sampleLogo'
import { buildReviewDb } from './reviewFixtures'
import { createReviewRpc } from './reviewRpc'

export const reviewDb = buildReviewDb()
const objects = new Map<string, Blob>()
let failNextInvoiceUpload = false
// Armed by main.tsx after seeding, so the seed's own PDF upload succeeds.
export const armUploadFailureFromUrl = () => {
  failNextInvoiceUpload = new URLSearchParams(window.location.search).get('fail-upload') === '1'
}

// Store the entity logo file and record its digest, as an upload would.
export const seeded = (async () => {
  const blob = await (await fetch(SAMPLE_LOGO.dataUrl)).blob()
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  for (const lv of reviewDb.entity_logo_versions) {
    objects.set(lv.storage_path as string, blob)
    lv.sha256 = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  }
})()
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

export const review = createReviewRpc(reviewDb, now)
const base = createMockSupabaseClient(reviewDb, review.rpc, joins)

export const supabase = {
  ...base,
  storage: {
    from: () => ({
      upload: async (path: string, file: Blob) => {
        if (failNextInvoiceUpload && path.includes('/Invoices/')) {
          failNextInvoiceUpload = false
          return { data: null, error: { message: 'Simulated upload failure (network dropped)' } }
        }
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
