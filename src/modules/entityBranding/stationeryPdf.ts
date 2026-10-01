import type { jsPDF } from 'jspdf'
import { BAND_TINT, fitLogo, invoiceTotals, resolveColors, tint, type Rgb } from './stationeryLogic'
import type { BilledPerson, EntityIdentity, InvoiceDoc, ReceiptDoc, Stationery } from './stationeryTypes'

// Entity document renderer (invoice and receipt) for the Branding & documents
// live preview. Layout is the candidate shown to the owner; owner
// refinements applied: no reserved space without a logo (title top-left),
// billed tenants with their email/phone from their profiles (absent fields
// omitted), effective payment instructions per document. With `markers`,
// numbered circles show where each field comes from. Documents never say
// "sent"; a receipt only confirms a payment the issuer recorded.

type JsPdfCtor = typeof jsPDF
const TEXT: Rgb = [19, 41, 61]
const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const DATE = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const longDate = (iso: string) => DATE.format(new Date(`${iso}T00:00:00Z`))

export type EntityDocument = { kind: 'invoice'; data: InvoiceDoc } | { kind: 'receipt'; data: ReceiptDoc }

export function personLines(people: BilledPerson[]): string[] {
  return people.flatMap((p) => [p.name, [p.email, p.phone].filter((x): x is string => !!x && x.trim() !== '').join(' · ')].filter((x) => x !== ''))
}

export function renderEntityDocument(JsPdf: JsPdfCtor, entity: EntityIdentity, s: Stationery, d: EntityDocument, markers = false): jsPDF {
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
  // Markers are drawn last so they never change the style of later text.
  const pending: [number, number, number][] = []
  const mark = (n: number, x: number, y: number) => {
    if (markers) pending.push([n, x, y])
  }

  // Header — top-left starts at the logo if there is one, else at the title
  // itself (no reserved space).
  const top = 66
  let y = top
  if (s.logo) {
    const { w, h } = fitLogo(s.logo.width, s.logo.height)
    doc.addImage(s.logo.dataUrl, s.logo.format, X, top - 12, w, h)
    mark(1, X - 12, top)
    y = top - 12 + h + 18
  }
  const name = entity.displayName?.trim() || entity.legalName
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

  const isInvoice = d.kind === 'invoice'
  font('bold', 22)
  setText(colors.heading)
  doc.text(isInvoice ? 'INVOICE' : 'RECEIPT', R, top, { align: 'right' })
  let fy = top + 20
  const status = isInvoice ? d.data.status?.trim() : null
  if (status) {
    font('bold', 9)
    setText(colors.highlight)
    doc.text(status, R, fy, { align: 'right' })
    fy += 16
  }
  const facts: [number, string, string][] = isInvoice
    ? [[6, 'Invoice no.', d.data.number], [7, 'Issue date', d.data.issueDate ? longDate(d.data.issueDate) : 'On issue'], [8, 'Due date', longDate(d.data.dueDate)], [9, 'Billing period', d.data.periodLabel]]
    : [[6, 'Receipt no.', d.data.number], [7, 'Payment date', longDate(d.data.paymentDate)]]
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

  // Parties: billed people with contact details from their profiles
  const col2 = X + (R - X) / 2
  font('bold', 8)
  setText(colors.secondary)
  doc.text(isInvoice ? 'BILL TO' : 'RECEIVED FROM', X, y)
  doc.text('RENTAL', col2, y)
  mark(isInvoice ? 10 : 8, X - 12, y)
  mark(isInvoice ? 11 : 12, col2 - 12, y)
  font('normal', 10)
  setText(TEXT)
  const people = personLines(isInvoice ? d.data.billTo : d.data.receivedFrom)
  if (!isInvoice) people.push([d.data.method, d.data.reference && `ref ${d.data.reference}`].filter(Boolean).join(' · '))
  const leftLines = people.flatMap((line) => doc.splitTextToSize(line, col2 - X - 16) as string[])
  doc.text(leftLines, X, y + 14)
  if (!isInvoice) mark(9, X - 12, y + 14 + (leftLines.length - 1) * 11.5)
  const rentalLines = doc.splitTextToSize(`${d.data.rental.address}\n${d.data.rental.unit}`, R - col2)
  doc.text(rentalLines, col2, y + 14)
  y += 14 + Math.max(leftLines.length, rentalLines.length) * 11.5 + 20

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
  const totals = d.kind === 'invoice' ? invoiceTotals(d.data.lines, d.data.priorUnpaid) : null
  const totalRow = (label: string, amount: number, size: number, color: Rgb, n: number | null) => {
    font('bold', size)
    setText(color)
    const amountText = MONEY.format(amount)
    const labelX = R - 8 - doc.getTextWidth(amountText) - 18 - doc.getTextWidth(label)
    doc.text(label, labelX, y)
    if (n !== null) mark(n, labelX - 12, y)
    doc.text(amountText, R - 8, y, { align: 'right' })
  }
  if (d.kind === 'invoice' && totals) {
    const hasPrior = d.data.priorUnpaid.length > 0
    totalRow(hasPrior ? 'Amount due — this invoice' : 'Amount due', totals.thisInvoice, 12, colors.highlight, 13)
    if (hasPrior) {
      y += 18
      const continued = d.data.priorUnpaid.some((p) => p.fromTenancy)
      totalRow(
        continued ? 'Total outstanding — this tenancy and the one it continues (this invoice + earlier unpaid below)' : 'Total outstanding for this tenancy (this invoice + earlier unpaid below)',
        totals.tenancyOutstanding,
        9,
        TEXT,
        18,
      )
    }
  } else {
    totalRow('Amount received', (d.data as ReceiptDoc).amount, 12, colors.highlight, 10)
  }
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
  if (isInvoice && d.data.priorUnpaid.length > 0) {
    block(
      17,
      'EARLIER UNPAID INVOICES — ALREADY BILLED, NOT CHARGED AGAIN ON THIS INVOICE',
      d.data.priorUnpaid
        .map((p) => `${p.number} (${p.periodLabel}${p.fromTenancy ? ` — earlier tenancy, ${p.fromTenancy}` : ''}): ${MONEY.format(p.outstanding)} remaining`)
        .join('\n'),
    )
  }
  if (isInvoice && d.data.paymentInstructions?.trim()) block(14, 'HOW TO PAY', d.data.paymentInstructions)
  const note = isInvoice ? d.data.note ?? s.defaults.invoiceNote : d.data.note ?? s.defaults.receiptNote
  if (note.trim()) block(isInvoice ? 15 : 13, 'NOTE', note)
  if (!isInvoice) {
    font('normal', 8)
    setText(colors.secondary)
    doc.text('This receipt confirms a payment recorded by the issuer. It is not a bank statement.', X, y)
  }

  // Footer
  font('normal', 8)
  setText(colors.secondary)
  const footer = [s.contact.replyTo.trim() ? `Questions: ${s.contact.replyTo.trim()}` : null, s.defaults.documentFooter.trim() || null, entity.legalName].filter(
    (x): x is string => !!x,
  )
  footer.forEach((line, i) => doc.text(doc.splitTextToSize(line, R - X)[0], X, H - 54 + i * 11))
  mark(isInvoice ? 16 : 14, X - 12, H - 54)

  for (const [n, mx, my] of pending) {
    doc.setFillColor(229, 57, 53)
    doc.circle(mx, my - 3, 6, 'F')
    font('bold', 7)
    doc.setTextColor(255, 255, 255)
    doc.text(String(n), mx, my - 0.5, { align: 'center' })
  }
  return doc
}

export async function entityDocumentBlob(entity: EntityIdentity, s: Stationery, d: EntityDocument, markers = false): Promise<Blob> {
  const { jsPDF: JsPdf } = await import('jspdf')
  return renderEntityDocument(JsPdf, entity, s, d, markers).output('blob')
}
