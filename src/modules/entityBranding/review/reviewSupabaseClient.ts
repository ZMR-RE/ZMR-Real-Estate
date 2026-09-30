// SIMULATED BACKEND for the Branding & documents review page only (aliased
// in place of shared/supabaseClient by vite.entity-branding-review.config.ts).
// No URL, no key, no network: fictional in-memory records and an in-memory
// Storage that, like the real policy, never overwrites a logo file.
import { createMockSupabaseClient, type MockDb } from '../../../devHarness/mockSupabase'
import { SAMPLE_LOGO } from './sampleLogo'

export const REVIEW_ACCOUNT = 'review-account'
const A = REVIEW_ACCOUNT
const LOGO_PATH = `${A}/entity-branding/ent-a/sample-v1.png`

const db: MockDb = {
  llcs: [
    { id: 'ent-a', account_id: A, archived: false, name: 'Example Holdings LLC', display_name: 'Example Holdings', mailing_address: '100 Main Street', mailing_city: 'Springfield', mailing_state: 'IL', mailing_zip: '62701' },
    { id: 'ent-b', account_id: A, archived: false, name: 'Sample Road Properties LLC', display_name: null, mailing_address: '27 Sample Road', mailing_city: 'Springfield', mailing_state: 'IL', mailing_zip: '62702' },
  ],
  entity_logo_versions: [{ id: 'logo-a1', account_id: A, entity_id: 'ent-a', storage_path: LOGO_PATH, sha256: 'a'.repeat(64), format: 'PNG', width: 240, height: 80, byte_size: 431, uploaded_at: '2026-09-30T12:00:00Z' }],
  entity_document_branding: [
    {
      entity_id: 'ent-a', account_id: A, heading_color: '#1F4E79', accent_color: '#C99730', highlight_color: '#1F4E79', secondary_color: '#5B6472',
      reply_to_email: 'billing@example.com', document_phone: '(555) 010-2030', website: 'example.com',
      payment_instructions: 'Zelle to billing@example.com, or a check payable to Example Holdings LLC mailed to the address above.',
      paper_size: 'letter', show_legal_name: true, default_invoice_note: 'Please include the invoice number with your payment.',
      default_receipt_note: 'Thank you — your payment has been recorded.', document_footer: 'Thank you for being a tenant with Example Holdings.',
      current_logo_id: 'logo-a1', version: 1,
    },
  ],
}

const objects = new Map<string, Blob>()
const seeded = fetch(SAMPLE_LOGO.dataUrl).then((r) => r.blob()).then((b) => { objects.set(LOGO_PATH, b) })

const base = createMockSupabaseClient(db, {})

export const supabase = {
  ...base,
  storage: {
    from: () => ({
      upload: async (path: string, file: Blob) => {
        if (objects.has(path)) return { data: null, error: { message: 'The resource already exists (logo files are never overwritten).' } }
        objects.set(path, file)
        return { data: { path }, error: null }
      },
      download: async (path: string) => {
        await seeded
        const file = objects.get(path)
        return file ? { data: file, error: null } : { data: null, error: { message: 'Object not found' } }
      },
      createSignedUrl: async () => ({ data: { signedUrl: '#simulated' }, error: null }),
    }),
  },
}
