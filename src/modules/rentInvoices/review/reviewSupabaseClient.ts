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
let failNextInvoiceLink = false
// Armed by main.tsx after seeding, so the seed's own PDF upload succeeds.
export const armUploadFailureFromUrl = () => {
  const q = new URLSearchParams(window.location.search)
  failNextInvoiceUpload = q.get('fail-upload') === '1'
  // ?fail-link=1: the upload succeeds, then linking it to the invoice fails once.
  failNextInvoiceLink = q.get('fail-link') === '1'
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
  tenancy_charge_rules: (row: MockRow) => ({
    ...row,
    tenancy_charge_statements: reviewDb.tenancy_charge_statements.filter((st) => st.rule_id === row.id),
  }),
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
    lease_billing_terms: reviewDb.lease_billing_terms.find((t) => t.lease_id === row.id) ?? null,
  }),
}

export const review = createReviewRpc(reviewDb, now)
const base = createMockSupabaseClient(reviewDb, review.rpc, joins)
// New rows get the same column defaults the real tables have (the shared
// harness insert only adds id/created_at).
const insertDefaults: Record<string, MockRow> = {
  tenancy_charge_rules: { status: 'active', version: 1, applied_invoice_id: null, notes: null },
  tenancy_charge_statements: { billed_invoice_id: null, document_id: null },
}
const baseFrom = base.from.bind(base)
base.from = (table: string) => {
  const qb = baseFrom(table) as unknown as { insert: (p: MockRow | MockRow[]) => unknown }
  const defaults = insertDefaults[table]
  if (defaults) {
    const insert = qb.insert.bind(qb)
    qb.insert = (p: MockRow | MockRow[]) => insert(Array.isArray(p) ? p.map((r) => ({ ...defaults, ...r })) : { ...defaults, ...p })
  }
  return qb as unknown as ReturnType<typeof baseFrom>
}
// The shared harness builder has no .neq(); the billing-rules box uses it.
// Added here (review page only) rather than editing the shared harness.
const builderProto = Object.getPrototypeOf(base.from('tenancy_charge_rules')) as { neq?: unknown }
builderProto.neq = function (this: { filters: ((r: MockRow) => boolean)[] }, col: string, val: unknown) {
  this.filters.push((r) => r[col] !== val)
  return this
}

const baseRpc = base.rpc.bind(base)
export const supabase = {
  ...base,
  rpc: (fn: string, args: Record<string, unknown>) => {
    if (fn === 'attach_invoice_pdf' && failNextInvoiceLink) {
      failNextInvoiceLink = false
      return Promise.resolve({ data: null, error: { message: 'Simulated failure while linking the stored PDF (network dropped)' } })
    }
    return baseRpc(fn, args)
  },
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
