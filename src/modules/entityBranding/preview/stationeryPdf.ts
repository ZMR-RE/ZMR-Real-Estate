import type { jsPDF } from 'jspdf'
import { BAND_TINT, fitLogo, resolveColors, tint, type Rgb } from './stationeryLogic'
import type { EntityProfileFields, SampleInvoice, SampleReceipt, Stationery } from './stationeryTypes'

// CANDIDATE document layout for the Branding & documents proposal (preview
// only — the Stage 1 renderer in rentInvoices/invoicePdf.ts is unchanged).
// With `markers`, small numbered circles show which field comes from where
// (see stationeryFields.ts). Documents never say "sent"; a receipt only
// confirms a payment the owner recorded.

type JsPdfCtor = typeof jsPDF
const TEXT: Rgb = [19, 41, 61]
const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const DATE = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const longDate = (iso: string) => DATE.format(new Date(`${iso}T00:00:00Z`))

export type StationeryDoc = { kind: 'invoice'; data: SampleInvoice } | { kind: 'receipt'; data: SampleReceipt }

export function renderStationeryPdf(JsPdf: JsPdfCtor, entity: EntityProfileFields, s: Stationery, d: StationeryDoc, markers: boolean): jsPDF {
  const { colors } = resolveColors(s)
  const doc = new JsPdf({ unit: 'pt', format: s.defaults.paperSize })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const X = 54
  const R = W - 54
  const setText = (c: Rgb) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style: 'normal' | 'bold', size: number) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
  }
  const rule = (at: number) => {
    const c = tint(colors.accent, 0.7)
    doc.setDrawColor(c[0], c[1], c[2])
    doc.setLineWidth(1)
    doc.line(X, at, R, at)
  }
  // Markers are collected and drawn LAST, so drawing one never changes the
  // font or colour of the text that follows it.
  const pending: [number, number, number][] = []
  const mark = (n: number, x: number, y: number) => {
    if (markers) pending.push([n, x, y])
  }
  const drawMarkers = () => {
    for (const [n, x, y] of pending) {
      doc.setFillColor(229, 57, 53)
      doc.circle(x, y - 3, 6, 'F')
      font('bold', 7)
      doc.setTextColor(255, 255, 255)
      doc.text(String(n), x, y - 0.5, { align: 'center' })
    }
  }

  // Header: logo, entity identity, contact
  let y = 54
  if (s.logo) {
    const { w, h } = fitLogo(s.logo.width, s.logo.height)
    doc.addImage(s.logo.dataUrl, s.logo.format, X, y - 10, w, h)
    mark(1, X - 12, y)
    y += h + 6
  }
  const name = entity.displayName?.trim() || entity.legalName
  y += 12
  font('bold', 16)
  setText(colors.heading)
  doc.text(name, X, y)
  mark(2, X - 12, y)
  font('normal', 9)
  setText(colors.secondary)
  let ly = y + 15
  if (s.defaults.showLegalName && entity.legalName !== name) {
    doc.text(entity.legalName, X, ly)
    mark(3, X - 12, ly)
    ly += 12
  }
  const cityLine = [entity.mailingCity, [entity.mailingState, entity.mailingZip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const address = [entity.mailingAddress, cityLine].filter((x): x is string => !!x && x.trim() !== '')
  address.forEach((line, i) => {
    doc.text(line, X, ly)
    if (i === 0) mark(4, X - 12, ly)
    ly += 12
  })
  const contact = [s.contact.phone.trim(), s.contact.website.trim()].filter(Boolean).join('  ·  ')
  if (contact) {
    doc.text(contact, X, ly)
    mark(5, X - 12, ly)
    ly += 12
  }

  // Title and facts (right)
  const isInvoice = d.kind === 'invoice'
  font('bold', 22)
  setText(colors.heading)
  const titleY = s.logo ? 54 + 12 : y
  doc.text(isInvoice ? 'INVOICE' : 'RECEIPT', R, titleY, { align: 'right' })
  const facts: [number, string, string][] = isInvoice
    ? [[6, 'Invoice no.', d.data.number], [7, 'Issue date', longDate(d.data.issueDate)], [8, 'Due date', longDate(d.data.dueDate)], [9, 'Billing period', d.data.periodLabel]]
    : [[6, 'Receipt no.', d.data.number], [7, 'Payment date', longDate(d.data.paymentDate)]]
  let fy = titleY + 20
  for (const [n, label, value] of facts) {
    font('normal', 9)
    setText(colors.secondary)
    doc.text(label, R - 150, fy)
    mark(n, R - 162, fy)
    font('bold', 9)
    setText(TEXT)
    doc.text(value, R, fy, { align: 'right' })
    fy += 14
  }
  y = Math.max(ly, fy) + 16
  rule(y)
  y += 22

  // Parties
  const col2 = X + (R - X) / 2
  font('bold', 8)
  setText(colors.secondary)
  doc.text(isInvoice ? 'BILL TO' : 'RECEIVED FROM', X, y)
  doc.text('RENTAL', col2, y)
  mark(isInvoice ? 10 : 8, X - 12, y)
  mark(isInvoice ? 11 : 12, col2 - 12, y)
  font('normal', 10)
  setText(TEXT)
  const left = isInvoice ? [d.data.billTo.name, d.data.billTo.email].filter(Boolean).join('\n') : `${d.data.receivedFrom}\n${[d.data.method, d.data.reference && `ref ${d.data.reference}`].filter(Boolean).join(' · ')}`
  const leftLines = doc.splitTextToSize(left, col2 - X - 16)
  doc.text(leftLines, X, y + 14)
  if (!isInvoice) mark(9, X - 12, y + 27)
  const rentalLines = doc.splitTextToSize(`${d.data.rental.address}\n${d.data.rental.unit}`, R - col2)
  doc.text(rentalLines, col2, y + 14)
  y += 14 + Math.max(leftLines.length, rentalLines.length) * 13 + 18

  // Table
  const band = tint(colors.accent, BAND_TINT)
  doc.setFillColor(band[0], band[1], band[2])
  doc.rect(X, y - 12, R - X, 20, 'F')
  font('bold', 9)
  setText(colors.secondary)
  doc.text(isInvoice ? 'DESCRIPTION' : 'APPLIED TO', X + 8, y + 1)
  doc.text('AMOUNT', R - 8, y + 1, { align: 'right' })
  mark(isInvoice ? 12 : 11, X - 12, y + 1)
  y += 24
  font('normal', 10)
  setText(TEXT)
  const rows = isInvoice
    ? d.data.lines.map((l) => ({ text: l.description, amount: l.amount }))
    : d.data.applied.map((a) => ({ text: `${a.invoiceNumber} — ${a.periodLabel} (remaining balance ${MONEY.format(a.remaining)})`, amount: a.amount }))
  for (const row of rows) {
    const t = doc.splitTextToSize(row.text, R - X - 140)
    doc.text(t, X + 8, y)
    doc.text(MONEY.format(row.amount), R - 8, y, { align: 'right' })
    y += t.length * 13 + 8
    rule(y - 10)
  }
  y += 8
  font('bold', 12)
  setText(colors.highlight)
  const total = isInvoice ? d.data.lines.reduce((sum, l) => sum + l.amount, 0) : d.data.amount
  const amountText = MONEY.format(total)
  const labelText = isInvoice ? 'Amount due' : 'Amount received'
  // Place the label from measured widths so longer labels never collide.
  const labelX = R - 8 - doc.getTextWidth(amountText) - 18 - doc.getTextWidth(labelText)
  doc.text(labelText, labelX, y)
  mark(isInvoice ? 13 : 10, labelX - 12, y)
  doc.text(amountText, R - 8, y, { align: 'right' })
  y += 30

  const block = (n: number, heading: string, body: string) => {
    font('bold', 8)
    setText(colors.secondary)
    doc.text(heading, X, y)
    mark(n, X - 12, y)
    font('normal', 10)
    setText(TEXT)
    const t = doc.splitTextToSize(body, R - X)
    doc.text(t, X, y + 14)
    y += 14 + t.length * 13 + 16
  }
  if (isInvoice && entity.paymentInstructions) block(14, 'HOW TO PAY', entity.paymentInstructions)
  const note = isInvoice ? d.data.note || s.defaults.invoiceNote : s.defaults.receiptNote
  if (note.trim()) block(isInvoice ? 15 : 13, 'NOTE', note)
  if (!isInvoice) {
    font('normal', 8)
    setText(colors.secondary)
    doc.text('This receipt confirms a payment recorded by the issuer. It is not a bank statement.', X, y)
    y += 14
  }

  // Footer
  font('normal', 8)
  setText(colors.secondary)
  const footer = [
    entity.replyTo ? `Questions: ${entity.replyTo}` : null,
    s.defaults.documentFooter.trim() || null,
    entity.legalName,
  ].filter((x): x is string => !!x)
  footer.forEach((line, i) => doc.text(doc.splitTextToSize(line, R - X)[0], X, H - 54 + i * 11))
  mark(isInvoice ? 16 : 14, X - 12, H - 54)
  drawMarkers()
  return doc
}

export async function stationeryPdfBlob(entity: EntityProfileFields, s: Stationery, d: StationeryDoc, markers: boolean): Promise<Blob> {
  const { jsPDF: JsPdf } = await import('jspdf')
  return renderStationeryPdf(JsPdf, entity, s, d, markers).output('blob')
}
