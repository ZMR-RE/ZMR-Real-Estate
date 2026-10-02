import { describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// H1 request shapes, through the real supabase-js client with fetch captured
// (no network). The existing payments request must be exactly today's.
const sent: { url: string; headers: Record<string, string> }[] = []
vi.mock('../../shared/supabaseClient', () => ({
  supabase: createClient('http://127.0.0.1:9', 'anon-test', {
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        sent.push({ url: String(input), headers: Object.fromEntries(new Headers(init?.headers)) })
        return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
      },
    },
  }),
}))
const { listMortgagePaymentsForAccount, listHistoryPaymentPrincipalsForAccount } = await import('./reportsQueries')
const BASE = 'http://127.0.0.1:9/rest/v1/'

describe('H1 queries', () => {
  it('existing payments query is unchanged (same URL as live d9cdcb3; no select *, no extra header)', async () => {
    sent.length = 0
    await listMortgagePaymentsForAccount('A', { year: 2025 })
    await listMortgagePaymentsForAccount('A')
    expect(sent.map((r) => r.url)).toEqual([
      `${BASE}mortgage_payments?select=property_id%2Cprincipal_amount&account_id=eq.A&voided=eq.false&payment_date=gte.2025-01-01&payment_date=lte.2025-12-31`,
      `${BASE}mortgage_payments?select=property_id%2Cprincipal_amount&account_id=eq.A&voided=eq.false`,
    ])
    expect(Object.keys(sent[0].headers).some((h) => h.startsWith('x-zmr'))).toBe(false)
  })
  it('history read: its own table, principal and property only, non-voided, account-scoped, optional year', async () => {
    sent.length = 0
    await listHistoryPaymentPrincipalsForAccount('A', { year: 2025 })
    await listHistoryPaymentPrincipalsForAccount('A')
    expect(sent.map((r) => r.url)).toEqual([
      `${BASE}mortgage_history_payments?select=property_id%2Cprincipal_amount&account_id=eq.A&voided=eq.false&payment_date=gte.2025-01-01&payment_date=lte.2025-12-31`,
      `${BASE}mortgage_history_payments?select=property_id%2Cprincipal_amount&account_id=eq.A&voided=eq.false`,
    ])
  })
})
