// Writes the FICTIONAL owner-review invoice PDFs from print snapshots — the
// same path the dashboard uses. Outside src/ so the app type-check doesn't
// need Node types. Runs only when asked:
//   WRITE_INVOICE_SAMPLES=docs/planning/agents/samples npx vitest run tools/invoice-samples
import { mkdirSync, writeFileSync } from 'node:fs'
import { jsPDF } from 'jspdf'
import { it } from 'vitest'
import { SAMPLE_LOGO } from '../../src/modules/entityBranding/review/sampleLogo'
import { renderEntityDocument } from '../../src/modules/entityBranding/stationeryPdf'
import { buildInvoiceRender, type InvoiceRender } from '../../src/modules/rentInvoices/invoiceDocument'
import { snapshot } from '../../src/modules/rentInvoices/invoiceSampleFixtures'

const write = (dir: string, name: string, r: InvoiceRender) =>
  writeFileSync(`${dir}/${name}`, Buffer.from(renderEntityDocument(jsPDF, r.entity, r.stationery, { kind: 'invoice', data: r.doc }).output('arraybuffer')))

it.runIf(!!process.env.WRITE_INVOICE_SAMPLES)('writes owner-review invoice samples', () => {
  const dir = process.env.WRITE_INVOICE_SAMPLES!
  mkdirSync(dir, { recursive: true })
  const logoSnap = { ...snapshot, branding: { ...snapshot.branding, logo: { id: 'l', storage_path: 'x', sha256: 'x', format: 'PNG' as const, width: SAMPLE_LOGO.width, height: SAMPLE_LOGO.height } } }
  // 1. Issued, with logo; entity-default instructions; one billed tenant with email + phone.
  write(dir, 'sample-1-issued-with-logo_A-INV-000001.pdf', buildInvoiceRender(logoSnap, { number: 'A-INV-000001', issuedAt: '2026-09-25T15:00:00Z' }, SAMPLE_LOGO))
  // 2. Draft, no logo (title top-left); co-tenants with only the contact details their profiles hold;
  //    property-specific instructions; a statement-based share; an earlier unpaid reference.
  write(
    dir,
    'sample-2-draft-no-logo_co-tenants.pdf',
    buildInvoiceRender(
      {
        ...snapshot,
        issuer: { ...snapshot.issuer!, display_name: null, legal_name: 'Sample Road Properties LLC', invoice_code: 'SRP', mailing_address: '27 Sample Road', mailing_zip: '62702' },
        branding: { ...snapshot.branding, heading_color: null, accent_color: null, highlight_color: null, secondary_color: null, document_phone: null, reply_to_email: null, document_footer: null },
        payment_instructions: { text: 'Check payable to Sample Road Properties LLC, dropped in the locked box at the site office.', source: 'property' },
        recipients: [
          { tenant_id: 't2', name: 'Jordan Sample', email: 'jordan@example.com', phone: null },
          { tenant_id: 't3', name: 'Sam Sample', email: null, phone: '(555) 010-3333' },
        ],
        rental: { property_address: '27 Sample Road', unit_label: 'Unit A' },
        period_start: '2026-11-01',
        period_end: '2026-11-30',
        due_date: '2026-11-05',
        lines: [
          { kind: 'rent', description: 'Rent — November 2026', amount: 1720 },
          { kind: 'charge', description: 'Gas — 50% of October 2026 statement ($84.20)', amount: 42.1 },
        ],
        amount_due: 1762.1,
        note: 'Rent is due by the 5th.',
        prior_unpaid: [{ number: 'SRP-INV-000001', period_start: '2026-10-01', outstanding: 1020 }],
      },
      null,
      null,
    ),
  )
})
