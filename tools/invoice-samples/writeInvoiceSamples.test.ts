// Writes the FICTIONAL owner-review invoice PDFs (issued + draft). Outside
// src/ so the app type-check doesn't need Node types. Runs only when asked:
//   WRITE_INVOICE_SAMPLES=docs/planning/agents/samples npx vitest run tools/invoice-samples
import { mkdirSync, writeFileSync } from 'node:fs'
import { jsPDF } from 'jspdf'
import { it } from 'vitest'
import { buildInvoiceDocument } from '../../src/modules/rentInvoices/invoiceDocument'
import { renderInvoicePdf } from '../../src/modules/rentInvoices/invoicePdf'
import { draftContext, issued } from '../../src/modules/rentInvoices/invoiceSampleFixtures'

it.runIf(!!process.env.WRITE_INVOICE_SAMPLES)('writes owner-review invoice samples', () => {
  const dir = process.env.WRITE_INVOICE_SAMPLES!
  mkdirSync(dir, { recursive: true })
  const issuedModel = buildInvoiceDocument(issued, null)
  writeFileSync(`${dir}/${issuedModel.filename}`, Buffer.from(renderInvoicePdf(jsPDF, issuedModel).output('arraybuffer')))
  const draftModel = buildInvoiceDocument(
    { ...issued, state: 'draft', number: null, issuer_snapshot: null, recipient_snapshot: null, issued_at: null, invoice_lines: [issued.invoice_lines[1]] },
    { ...draftContext, unitLabel: 'Unit 1', issuer: issued.issuer_snapshot! },
  )
  writeFileSync(`${dir}/${draftModel.filename}`, Buffer.from(renderInvoicePdf(jsPDF, draftModel).output('arraybuffer')))
})
