import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../../index.css'
import { AppShell } from '../../../shared/AppShell'
import { RentOps } from '../../rentOps/RentOps'
import { buildInvoiceRender } from '../invoiceDocument'
import { invoicePdfBlob } from '../invoicePdf'
import { attachIssuedInvoicePdf, loadSnapshotLogo } from '../rentInvoicesQueries'
import type { IssuedSnapshot } from '../rentInvoiceTypes'
import { armUploadFailureFromUrl, review, reviewDb, seeded, supabase } from './reviewSupabaseClient'

// REVIEW PAGE (rent-invoices-review.html): the REAL Rent ops screen inside
// the real AppShell, against the SIMULATED backend. Seeds a realistic state
// through the same action mirror the screen uses. Fictional data:
//   • 410 Example St Unit 1 — October issued (A-INV-000001, stored PDF with
//     logo); November owner draft listing October as an earlier unpaid
//     reference (not billed again).
//   • 27 Sample Rd Unit A — November assistant draft with billing-rule lines
//     (fixed pest-control share, 50% of the entered gas statement) and the
//     property's own payment instructions.
//   • 410 Example St Unit 2 (co-tenants) — approved, then the entity's
//     document footer changed: shows "Changed since you approved it".
// Add ?fail-upload=1 to make the next issue's PDF upload fail once.
async function seed() {
  await seeded
  const call = async (fn: string, args: Record<string, unknown>) => (await supabase.rpc(fn, args)).data
  const riley = (await call('create_invoice_draft', { p_lease_id: 'lease-riley', p_period_start: '2026-10-01' })) as string
  await call('update_invoice_draft', { p_id: riley, p_expected_version: 1, p_patch: { visible_note: 'Thank you!' } })
  await call('approve_invoice', { p_id: riley, p_expected_version: 2 })
  await call('issue_invoice', { p_id: riley, p_expected_version: 3 })
  const row = reviewDb.invoices.find((i) => i.id === riley)!
  const s = row.issued_snapshot as unknown as IssuedSnapshot
  const logo = s.branding.logo ? (await loadSnapshotLogo(s.branding.logo)).data : null
  const r = buildInvoiceRender(s, { number: s.number, issuedAt: s.issued_at }, logo)
  await attachIssuedInvoicePdf({ id: riley, account_id: row.account_id as string, property_id: row.property_id as string }, r.filename, await invoicePdfBlob(r))
  await call('create_invoice_draft', { p_lease_id: 'lease-riley', p_period_start: '2026-11-01' })
  review.createDraftCore('lease-casey', '2026-11-01', 'assistant', null, null)
  const jordan = (await call('create_invoice_draft', { p_lease_id: 'lease-jordan', p_period_start: '2026-10-01' })) as string
  await call('approve_invoice', { p_id: jordan, p_expected_version: 1 })
  const brandingA = reviewDb.entity_document_branding.find((b) => b.entity_id === 'ent-a')!
  brandingA.document_footer = 'Questions about this invoice? Call or email us.'
  armUploadFailureFromUrl()
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
