// ISOLATED MOCK for the harness only. Aliased in place of
// ../../shared/supabaseClient by vite.harness.config.ts's resolve.alias
// — every real query file's `import { supabase } from
// '../../shared/supabaseClient'` resolves to THIS file only inside the
// harness bundle. No URL, no key, no network call can reach any real
// Supabase project from here; the real supabaseClient.ts is never
// imported by the harness build at all.
import { buildFixtureDb } from './fixtures'
import { createMockRpcHandlers } from './mockRpc'
import { createMockSupabaseClient, type MockRow } from './mockSupabase'

export const harnessDb = buildFixtureDb()

const joins = {
  contact_links: (row: MockRow) => {
    const contact = harnessDb.contacts.find((c) => c.id === row.contact_id)
    const methods = harnessDb.contact_methods.filter((m) => m.contact_id === row.contact_id)
    return { ...row, contact: contact ? { ...contact, contact_methods: methods } : null }
  },
  document_owner_links: (row: MockRow) => {
    const document = harnessDb.documents.find((d) => d.id === row.document_id)
    return { ...row, document: document ?? null }
  },
}

export const supabase = createMockSupabaseClient(harnessDb, createMockRpcHandlers(harnessDb), joins)
