import { jsPDF } from 'jspdf'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SAMPLE_LOGO } from '../entityBranding/review/sampleLogo'
import { buildInvoiceRender } from './invoiceDocument'
import { renderInvoicePdf } from './invoicePdf'
import { snapshot } from './invoiceSampleFixtures'

// In-memory Storage + RPC stand-in for the supabase client (this test only).
const store = new Map<string, Uint8Array<ArrayBuffer>>()
const calls: string[] = []
let linked: { storage_path: string; sha256: string } | null = null
let failNextLink = false

vi.mock('../../shared/supabaseClient', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: async (path: string, file: Blob, opts: { upsert?: boolean }) => {
          calls.push(`upload upsert=${String(opts?.upsert)}`)
          if (store.has(path)) return { data: null, error: { statusCode: '409', message: 'The resource already exists' } }
          store.set(path, new Uint8Array(await file.arrayBuffer()))
          return { data: { path }, error: null }
        },
        download: async (path: string) => {
          calls.push('download')
          const b = store.get(path)
          return b ? { data: new Blob([b]), error: null } : { data: null, error: { message: 'not found' } }
        },
        remove: async () => {
          calls.push('REMOVE')
          return { data: null, error: null }
        },
        update: async () => {
          calls.push('UPDATE')
          return { data: null, error: null }
        },
      }),
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push(`rpc ${fn}`)
      if (failNextLink) {
        failNextLink = false
        return { data: null, error: { message: 'network dropped while linking' } }
      }
      linked = { storage_path: String(args.p_storage_path), sha256: String(args.p_sha256) }
      return { data: 'doc-1', error: null }
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => ({ returns: async () => ({ data: linked ? { detail: linked } : null, error: null }) }),
          }),
        }),
      }),
    }),
  },
}))

const { attachIssuedInvoicePdf } = await import('./rentInvoicesQueries')
const inv = { id: 'inv-1', account_id: 'acc', property_id: 'prop' }
const issued = { number: 'A-INV-000001', issuedAt: '2026-09-25T15:00:00Z' }
const issuedBlob = (logo = false) => {
  const r = buildInvoiceRender(snapshot, issued, logo ? SAMPLE_LOGO : null)
  return { blob: new Blob([renderInvoicePdf(jsPDF, r).output('arraybuffer')], { type: 'application/pdf' }), filename: r.filename }
}
const sha = async (b: Uint8Array<ArrayBuffer> | Blob) => {
  const buf = b instanceof Blob ? await b.arrayBuffer() : b
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)), (x) => x.toString(16).padStart(2, '0')).join('')
}

beforeEach(() => {
  store.clear()
  calls.length = 0
  linked = null
  failNextLink = false
})

describe('issued invoice PDF is deterministic', () => {
  it('the frozen document renders to identical bytes every time (with and without a logo)', async () => {
    for (const logo of [false, true]) {
      const a = issuedBlob(logo).blob
      await new Promise((r) => setTimeout(r, 1100)) // a different wall-clock second
      expect(await sha(issuedBlob(logo).blob)).toBe(await sha(a))
    }
  })
})

describe('Store PDF recovery (T3 finding)', () => {
  it('upload succeeded but linking failed → retry reuses the identical object and links it, never overwriting', async () => {
    const { blob, filename } = issuedBlob()
    const path = `acc/prop/Invoices/${filename}`
    failNextLink = true
    const first = await attachIssuedInvoicePdf(inv, filename, blob)
    expect(first.error).toBeTruthy()
    expect(store.has(path)).toBe(true) // the bytes were uploaded
    expect(linked).toBeNull() // but not linked

    // Retry renders the frozen document again (fresh Blob, same bytes).
    const again = issuedBlob()
    const second = await attachIssuedInvoicePdf(inv, again.filename, again.blob)
    expect(second.error).toBeNull()
    expect(linked).toEqual({ storage_path: path, sha256: await sha(again.blob) })
    expect(calls).toEqual([
      'upload upsert=false', 'rpc attach_invoice_pdf', // first attempt: upload ok, link failed
      'upload upsert=false', 'download', 'rpc attach_invoice_pdf', // retry: exists → verified → linked
    ])
  })

  it('a DIFFERENT file at the invoice path is never linked or overwritten', async () => {
    const { blob, filename } = issuedBlob()
    const path = `acc/prop/Invoices/${filename}`
    store.set(path, new Uint8Array([1, 2, 3]))
    const res = await attachIssuedInvoicePdf(inv, filename, blob)
    expect(res.error?.message).toMatch(/different file .* not linked or overwritten/)
    expect(linked).toBeNull()
    expect(Array.from(store.get(path)!)).toEqual([1, 2, 3])
    expect(calls).not.toContain('rpc attach_invoice_pdf')
    expect(calls.some((c) => c === 'REMOVE' || c === 'UPDATE' || c === 'upload upsert=true')).toBe(false)
  })

  it('already linked: identical bytes succeed without re-uploading; anything else is refused', async () => {
    const { blob, filename } = issuedBlob()
    linked = { storage_path: `acc/prop/Invoices/${filename}`, sha256: await sha(blob) }
    expect((await attachIssuedInvoicePdf(inv, filename, blob)).error).toBeNull()
    expect(calls.filter((c) => c.startsWith('upload'))).toEqual([])
    linked = { storage_path: `acc/prop/Invoices/${filename}`, sha256: '0'.repeat(64) }
    expect((await attachIssuedInvoicePdf(inv, filename, blob)).error?.message).toMatch(/already has a different stored PDF/)
  })
})
