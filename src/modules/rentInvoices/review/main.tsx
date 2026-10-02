import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../../index.css'
import { AppShell } from '../../../shared/AppShell'
import { EntityProfile } from '../../llcs/EntityProfile'
import { PropertyProfile } from '../../properties/PropertyProfile'
import { RentOps } from '../../rentOps/RentOps'
import { TenantProfile } from '../../tenants/TenantProfile'
import { buildInvoiceRender } from '../invoiceDocument'
import { invoicePdfBlob } from '../invoicePdf'
import { attachIssuedInvoicePdf, loadSnapshotLogo } from '../rentInvoicesQueries'
import type { IssuedSnapshot } from '../rentInvoiceTypes'
import { ReviewBillingBoxes } from './ReviewBillingBoxes'
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
// Add ?long=1 for layout checks: long fictional names, plus more issued
// states (a second issued invoice, a partial payment, a cancelled invoice).
const params = new URLSearchParams(window.location.search)
const longMode = params.has('long')

function applyLongNames() {
  const set = (rows: Record<string, unknown>[], id: string, patch: Record<string, unknown>) => Object.assign(rows.find((r) => r.id === id)!, patch)
  set(reviewDb.properties, 'prop-410', { address: '12345 North Longfellow Boulevard Extension' })
  set(reviewDb.units, 'unit-1', { unit_label: 'Apartment 12B (rear building)' })
  set(reviewDb.tenants, 't-riley', { name: 'Riley Alexandra Example-Montgomery' })
  set(reviewDb.tenants, 't-jordan', { name: 'Jordan Christopher Samplewright' })
  set(reviewDb.tenants, 't-casey', { name: 'Casey Placeholder-Vandenberg' })
}

// A real database returns null for every empty column; the fictional
// property rows only list the columns the invoice screens use. Fill the
// rest with null so the real property profile renders (Billing settings
// in place). Column list from the properties table.
const PROPERTY_COLUMNS = ['ac_type', 'basement', 'bathroom_count', 'bedroom_count', 'city', 'contact_email', 'contact_phone', 'county', 'county_assessor_use_code', 'created_at', 'exterior_wall_material', 'exterior_wall_materials', 'garage_parking_spaces', 'garage_spaces', 'heating_type', 'insurance_policy_number', 'insurance_provider', 'lease_terms', 'legacy_contact_reconciled_at', 'llc_id', 'lot_size', 'lot_size_unit', 'lot_size_value', 'municipal_zoning_code', 'owner_name', 'parking_notes', 'property_tax_id', 'property_type', 'purchase_date', 'purchase_method', 'purchase_price', 'square_footage', 'state', 'status', 'street_parking', 'township', 'updated_at', 'utilities', 'year_built', 'zip', 'zoning_use_code']

function completePropertyRows() {
  // Units and lease-tenant links in a real database always carry account_id.
  for (const lt of reviewDb.lease_tenants as Record<string, unknown>[]) if (!('account_id' in lt)) lt.account_id = 'review-account'
  // Leases in a real database always carry these columns (null when empty).
  for (const l of reviewDb.leases as Record<string, unknown>[]) {
    for (const col of ['late_fee', 'move_in_fee', 'end_reason']) if (!(col in l)) l[col] = null
  }
  for (const u of reviewDb.units as Record<string, unknown>[]) {
    if (!('account_id' in u)) u.account_id = 'review-account'
    if (!('archived' in u)) u.archived = false
    if (!('status' in u)) u.status = ''
  }
  for (const row of reviewDb.properties as Record<string, unknown>[]) {
    for (const col of PROPERTY_COLUMNS) if (!(col in row)) row[col] = col === 'exterior_wall_materials' ? [] : null // not null, default '{}'
  }
}

// Review page only: lets a reviewer inspect the simulated rows (e.g. that a
// retried save made one lease, not two). Never part of the app bundle.
;(window as unknown as { __reviewDb: unknown }).__reviewDb = reviewDb

async function seed() {
  await seeded
  completePropertyRows()
  if (longMode) applyLongNames()
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
  if (longMode) {
    // November issued too; a partial payment on October; December issued then cancelled.
    const nov = reviewDb.invoices.find((i) => i.lease_id === 'lease-riley' && i.period_start === '2026-11-01')!
    await call('approve_invoice', { p_id: nov.id, p_expected_version: nov.version })
    await call('issue_invoice', { p_id: nov.id, p_expected_version: (nov.version as number) + 1 })
    reviewDb.payments.push({ id: 'pay-long-1', invoice_id: riley, amount: 600, paid_date: '2026-10-03', method: 'Zelle', notes: 'Fictional partial payment' })
    const dec = (await call('create_invoice_draft', { p_lease_id: 'lease-riley', p_period_start: '2026-12-01' })) as string
    await call('approve_invoice', { p_id: dec, p_expected_version: 1 })
    await call('issue_invoice', { p_id: dec, p_expected_version: 2 })
    await call('cancel_invoice', { p_id: dec, p_expected_version: 3, p_reason: 'Entered twice (fictional)' })
  }
  armUploadFailureFromUrl()
}


// ?persist=1 (review page only): the tenancy rows (tenants, leases, links)
// survive a real page reload in this tab, so recovery after leaving or
// reloading is tested against saved rows rather than screen memory.
const PERSIST_KEY = 'zmr-review-tenancy-rows'
const PERSISTED = ['tenants', 'leases', 'lease_tenants'] as const
function restorePersistedRows() {
  if (!params.has('persist')) return
  const saved = sessionStorage.getItem(PERSIST_KEY)
  if (saved) for (const [table, rows] of Object.entries(JSON.parse(saved) as Record<string, Record<string, unknown>[]>)) reviewDb[table].splice(0, reviewDb[table].length, ...rows)
  window.addEventListener('pagehide', () => {
    sessionStorage.setItem(PERSIST_KEY, JSON.stringify(Object.fromEntries(PERSISTED.map((t) => [t, reviewDb[t]]))))
  })
}

seed().then(() => {
  restorePersistedRows()
  createRoot(document.getElementById('rent-invoices-review-root')!).render(
    <StrictMode>
      {/* ?path=/tenants/t-casey opens the real tenant profile (Tenancy & billing, Billing rules);
          ?path=/billing-boxes the Entity › Invoicing and Property › Billing settings boxes;
          ?path=/entities/ent-a and ?path=/properties/prop-410 the full real profile pages. */}
      <MemoryRouter initialEntries={[params.get('path') || '/rent-ops']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/rent-ops" element={<RentOps />} />
            <Route path="/tenants/:id" element={<TenantProfile />} />
            <Route path="/billing-boxes" element={<ReviewBillingBoxes />} />
            <Route path="/entities/:id" element={<EntityProfile />} />
            <Route path="/properties/:id" element={<PropertyProfile />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )
})
