// Writes the FICTIONAL Branding & documents proposal samples (invoice and
// receipt, with and without field-source markers). Runs only when asked:
//   WRITE_STATIONERY_SAMPLES=docs/planning/agents/branding-samples npx vitest run tools/invoice-samples
import { mkdirSync, writeFileSync } from 'node:fs'
import { jsPDF } from 'jspdf'
import { it } from 'vitest'
import { SAMPLE_ENTITY, SAMPLE_INVOICE, SAMPLE_RECEIPT, SAMPLE_STATIONERY } from '../../src/modules/entityBranding/preview/stationeryFixtures'
import { renderStationeryPdf } from '../../src/modules/entityBranding/preview/stationeryPdf'

it.runIf(!!process.env.WRITE_STATIONERY_SAMPLES)('writes branding proposal samples', () => {
  const dir = process.env.WRITE_STATIONERY_SAMPLES!
  mkdirSync(dir, { recursive: true })
  const write = (name: string, pdf: jsPDF) => writeFileSync(`${dir}/${name}`, Buffer.from(pdf.output('arraybuffer')))
  write('PROPOSAL_invoice_A-INV-000001_2026-10_Unit-1.pdf', renderStationeryPdf(jsPDF, SAMPLE_ENTITY, SAMPLE_STATIONERY, { kind: 'invoice', data: SAMPLE_INVOICE }, false))
  write('PROPOSAL_receipt_A-RCT-000001_2026-10-03_Unit-1.pdf', renderStationeryPdf(jsPDF, SAMPLE_ENTITY, SAMPLE_STATIONERY, { kind: 'receipt', data: SAMPLE_RECEIPT }, false))
  write('PROPOSAL_invoice_field-sources.pdf', renderStationeryPdf(jsPDF, SAMPLE_ENTITY, SAMPLE_STATIONERY, { kind: 'invoice', data: SAMPLE_INVOICE }, true))
  write('PROPOSAL_receipt_field-sources.pdf', renderStationeryPdf(jsPDF, SAMPLE_ENTITY, SAMPLE_STATIONERY, { kind: 'receipt', data: SAMPLE_RECEIPT }, true))
})
