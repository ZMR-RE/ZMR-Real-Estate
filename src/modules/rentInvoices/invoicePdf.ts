import type { jsPDF } from 'jspdf'
import type { InvoiceDocumentModel } from './invoiceDocument'
import { formatLongDate } from './invoiceDocument'

// Renders the invoice PDF from the document model. Takes the jsPDF
// constructor as a parameter so the same code runs in the browser (loaded
// lazily, as tableExport does) and in Node tests/sample generation.
// Colours follow DESIGN-SYSTEM.md: navy #123456 for headings, #5b6472 for
// secondary text, #dde3ea for rules. The document never says "sent" or
// "paid" — Stage 1 does neither.

type JsPdfCtor = typeof jsPDF

const NAVY: [number, number, number] = [18, 52, 86]
const TEXT: [number, number, number] = [19, 41, 61]
const MUTED: [number, number, number] = [91, 100, 114]
const RULE: [number, number, number] = [221, 227, 234]
const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatMoney(value: number): string {
  return MONEY.format(value)
}

export function renderInvoicePdf(JsPdf: JsPdfCtor, m: InvoiceDocumentModel): jsPDF {
  const doc = new JsPdf({ unit: 'pt', format: 'letter' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const X = 54
  const R = W - 54
  let y = 64

  const color = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style: 'normal' | 'bold', size: number) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
  }
  const rule = (at: number) => {
    doc.setDrawColor(RULE[0], RULE[1], RULE[2])
    doc.setLineWidth(1)
    doc.line(X, at, R, at)
  }

  if (m.isDraft) {
    font('bold', 96)
    doc.setTextColor(236, 239, 243)
    doc.text('DRAFT', W / 2, H / 2 + 60, { align: 'center', angle: 30 })
  }

  // Issuer (left) and document facts (right)
  font('bold', 16)
  color(NAVY)
  doc.text(m.issuer.name, X, y)
  font('normal', 9)
  color(MUTED)
  let ly = y + 16
  if (m.issuer.legalName !== m.issuer.name) {
    doc.text(m.issuer.legalName, X, ly)
    ly += 12
  }
  for (const line of m.issuer.addressLines) {
    doc.text(line, X, ly)
    ly += 12
  }

  font('bold', 22)
  color(NAVY)
  doc.text(m.title.toUpperCase(), R, y, { align: 'right' })
  const facts: [string, string][] = [
    ['Invoice no.', m.number ?? 'Not numbered (draft)'],
    ...(m.issueDate ? ([['Issue date', formatLongDate(m.issueDate)]] as [string, string][]) : []),
    ['Due date', formatLongDate(m.dueDate)],
    ['Billing period', m.periodLabel],
  ]
  let fy = y + 20
  for (const [label, value] of facts) {
    font('normal', 9)
    color(MUTED)
    doc.text(label, R - 150, fy)
    font('bold', 9)
    color(TEXT)
    doc.text(value, R, fy, { align: 'right' })
    fy += 14
  }

  y = Math.max(ly, fy) + 18
  if (m.isDraft) {
    doc.setFillColor(255, 247, 209)
    doc.rect(X, y - 12, R - X, 22, 'F')
    font('bold', 9)
    color(TEXT)
    doc.text('Draft for review — not issued and not sent. The number is assigned only when you issue it.', X + 8, y + 2)
    y += 28
  }
  rule(y)
  y += 22

  // Bill to / rental
  const col2 = X + (R - X) / 2
  font('bold', 8)
  color(MUTED)
  doc.text('BILL TO', X, y)
  doc.text('RENTAL', col2, y)
  font('normal', 10)
  color(TEXT)
  const billTo = doc.splitTextToSize([m.billTo.name, m.billTo.email].filter(Boolean).join('\n'), col2 - X - 16)
  doc.text(billTo, X, y + 14)
  const rental = doc.splitTextToSize(`${m.property.address}\n${m.property.unit}`, R - col2)
  doc.text(rental, col2, y + 14)
  y += 14 + Math.max(billTo.length, rental.length) * 13 + 18

  // Lines
  doc.setFillColor(238, 241, 245)
  doc.rect(X, y - 12, R - X, 20, 'F')
  font('bold', 9)
  color(MUTED)
  doc.text('DESCRIPTION', X + 8, y + 1)
  doc.text('AMOUNT', R - 8, y + 1, { align: 'right' })
  y += 24
  font('normal', 10)
  color(TEXT)
  for (const line of m.lines) {
    const desc = doc.splitTextToSize(line.description, R - X - 140)
    doc.text(desc, X + 8, y)
    doc.text(formatMoney(line.amount), R - 8, y, { align: 'right' })
    y += desc.length * 13 + 8
    rule(y - 10)
  }
  y += 8
  font('bold', 12)
  color(NAVY)
  doc.text('Amount due', R - 150, y)
  doc.text(formatMoney(m.total), R - 8, y, { align: 'right' })
  y += 30

  const block = (heading: string, body: string) => {
    font('bold', 8)
    color(MUTED)
    doc.text(heading, X, y)
    font('normal', 10)
    color(TEXT)
    const text = doc.splitTextToSize(body, R - X)
    doc.text(text, X, y + 14)
    y += 14 + text.length * 13 + 16
  }
  if (m.issuer.paymentInstructions) block('HOW TO PAY', m.issuer.paymentInstructions)
  if (m.note) block('NOTE', m.note)

  // Footer
  font('normal', 8)
  color(MUTED)
  const footer = [
    m.issuer.replyTo ? `Questions about this invoice: ${m.issuer.replyTo}` : null,
    m.revision > 1 && m.number ? `This revision (${m.number}) replaces the earlier version of this invoice.` : null,
    m.issuer.legalName,
  ].filter((x): x is string => !!x)
  footer.forEach((line, i) => doc.text(line, X, H - 54 + i * 11))

  return doc
}

// Browser helper: lazily loads jsPDF (keeps it out of the main bundle).
export async function invoicePdfBlob(m: InvoiceDocumentModel): Promise<Blob> {
  const { jsPDF: JsPdf } = await import('jspdf')
  return renderInvoicePdf(JsPdf, m).output('blob')
}
