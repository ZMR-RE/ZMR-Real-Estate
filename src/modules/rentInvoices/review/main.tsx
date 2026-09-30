import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../../index.css'
import { AppShell } from '../../../shared/AppShell'
import { RentOps } from '../../rentOps/RentOps'
import { buildInvoiceDocument } from '../invoiceDocument'
import { invoicePdfBlob } from '../invoicePdf'
import { attachIssuedInvoicePdf } from '../rentInvoicesQueries'
import type { RentInvoiceRow } from '../rentInvoiceTypes'
import { reviewDb, supabase } from './reviewSupabaseClient'

// REVIEW PAGE (rent-invoices-review.html): the REAL Rent ops screen inside
// the real AppShell, against the SIMULATED backend. Seeds a realistic state
// through the same action mirror the screen uses: one issued invoice with its
// stored PDF, one assistant draft, one approved owner draft. Fictional data.
async function seed() {
  const call = async (fn: string, args: Record<string, unknown>) => (await supabase.rpc(fn, args)).data
  const riley = (await call('create_invoice_draft', { p_lease_id: 'lease-riley', p_period_start: '2026-10-01', p_created_via: 'owner' })) as string
  await call('update_invoice_draft', { p_id: riley, p_expected_version: 1, p_patch: { visible_note: 'Thank you — please include the invoice number with your payment.' } })
  await call('approve_invoice', { p_id: riley, p_expected_version: 2 })
  await call('issue_invoice', { p_id: riley, p_expected_version: 3 })
  const issued = reviewDb.invoices.find((i) => i.id === riley) as unknown as RentInvoiceRow
  const row = { ...issued, invoice_lines: reviewDb.invoice_lines.filter((l) => l.invoice_id === riley) } as unknown as RentInvoiceRow
  const model = buildInvoiceDocument(row, null)
  await attachIssuedInvoicePdf(row, model.filename, await invoicePdfBlob(model))
  await call('create_invoice_draft', { p_lease_id: 'lease-casey', p_period_start: '2026-11-01', p_created_via: 'assistant', p_visible_note: 'Rent is due by the 5th.' })
  const jordan = (await call('create_invoice_draft', { p_lease_id: 'lease-jordan', p_period_start: '2026-10-01', p_created_via: 'owner' })) as string
  await call('approve_invoice', { p_id: jordan, p_expected_version: 1 })
}

seed().then(() => {
  createRoot(document.getElementById('rent-invoices-review-root')!).render(
    <StrictMode>
      <MemoryRouter initialEntries={['/rent-ops']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/rent-ops" element={<RentOps />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )
})
