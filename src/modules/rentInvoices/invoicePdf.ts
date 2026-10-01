import type { jsPDF as JsPdfClass } from 'jspdf'
import { renderEntityDocument } from '../entityBranding/stationeryPdf'
import type { InvoiceRender } from './invoiceDocument'

// The invoice PDF is the entity document (Branding & documents renderer),
// filled from the print snapshot. For an issued invoice the creation date and
// file ID are pinned (see InvoiceRender.fixed), so the same frozen document
// always produces byte-identical output.
export function renderInvoicePdf(JsPdf: typeof JsPdfClass, r: InvoiceRender): JsPdfClass {
  const doc = renderEntityDocument(JsPdf, r.entity, r.stationery, { kind: 'invoice', data: r.doc })
  if (r.fixed) {
    doc.setCreationDate(new Date(r.fixed.issuedAt))
    doc.setFileId(r.fixed.fileId)
  }
  return doc
}

// jsPDF loads lazily in the browser.
export async function invoicePdfBlob(r: InvoiceRender): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  return renderInvoicePdf(jsPDF, r).output('blob')
}
