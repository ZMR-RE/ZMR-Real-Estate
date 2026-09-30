import { renderEntityDocument } from '../entityBranding/stationeryPdf'
import type { InvoiceRender } from './invoiceDocument'

// The invoice PDF is the entity document (Branding & documents renderer),
// filled from the print snapshot. jsPDF loads lazily in the browser.
export async function invoicePdfBlob(r: InvoiceRender): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  return renderEntityDocument(jsPDF, r.entity, r.stationery, { kind: 'invoice', data: r.doc }).output('blob')
}
