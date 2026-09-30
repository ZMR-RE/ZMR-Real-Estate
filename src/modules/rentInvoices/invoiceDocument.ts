import type { DraftContext, IssuerSnapshot, RentInvoiceRow } from './rentInvoiceTypes'

// Builds the one document model both the on-screen review and the PDF use.
// An ISSUED invoice is rendered only from its stored snapshots, so later
// changes to entity or tenant settings never alter it. A draft is rendered
// from current values and is always marked DRAFT with no number.
// Nothing here states that the invoice was sent or paid.

export interface InvoiceDocumentModel {
  isDraft: boolean
  title: string
  number: string | null
  revision: number
  issuer: { name: string; legalName: string; addressLines: string[]; replyTo: string | null; paymentInstructions: string | null }
  billTo: { name: string; email: string | null }
  property: { address: string; unit: string }
  issueDate: string | null
  dueDate: string
  periodLabel: string
  lines: { description: string; amount: number }[]
  total: number
  note: string | null
  filename: string
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function formatLongDate(isoDate: string): string {
  return DATE.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`))
}

export function periodLabel(periodStart: string): string {
  return MONTH.format(new Date(`${periodStart.slice(0, 10)}T00:00:00Z`))
}

// Approved convention: A-INV-000001_2026-10_Unit-1.pdf (unit label only —
// no tenant name, since the file travels as an attachment).
export function unitSlug(unitLabel: string): string {
  return unitLabel.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Unit'
}

export function invoiceFilename(number: string | null, periodStart: string, unitLabel: string): string {
  return `${number ?? 'DRAFT'}_${periodStart.slice(0, 7)}_${unitSlug(unitLabel)}.pdf`
}

function addressLines(i: Pick<IssuerSnapshot, 'mailing_address' | 'mailing_city' | 'mailing_state' | 'mailing_zip'>): string[] {
  const cityLine = [i.mailing_city, [i.mailing_state, i.mailing_zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [i.mailing_address, cityLine].filter((x): x is string => !!x && x.trim() !== '')
}

export function buildInvoiceDocument(inv: RentInvoiceRow, draft: DraftContext | null): InvoiceDocumentModel {
  const issued = inv.state === 'issued' || inv.state === 'superseded' || inv.state === 'cancelled'
  if (issued && (!inv.issuer_snapshot || !inv.recipient_snapshot || !inv.number)) {
    throw new Error('An issued invoice must be rendered from its stored snapshots.')
  }
  if (!issued && !draft) throw new Error('A draft preview needs the current issuer and unit details.')

  const issuer = issued ? inv.issuer_snapshot! : draft!.issuer
  const recipient = issued
    ? inv.recipient_snapshot!
    : { name: inv.recipient_name, email: inv.recipient_email, property_address: draft!.propertyAddress, unit_label: draft!.unitLabel }
  const unit = recipient.unit_label ?? ''
  const lines = [...inv.invoice_lines].sort((a, b) => a.sort_order - b.sort_order).map((l) => ({ description: l.description, amount: Number(l.amount) }))

  return {
    isDraft: !issued,
    title: inv.state === 'cancelled' ? 'Invoice — cancelled' : inv.revision > 1 ? 'Invoice — revised' : 'Invoice',
    number: issued ? inv.number : null,
    revision: inv.revision,
    issuer: {
      name: issuer.display_name?.trim() || issuer.legal_name,
      legalName: issuer.legal_name,
      addressLines: addressLines(issuer),
      replyTo: issuer.reply_to,
      paymentInstructions: issuer.payment_instructions,
    },
    billTo: { name: recipient.name ?? '', email: recipient.email },
    property: { address: recipient.property_address ?? '', unit },
    issueDate: issued && inv.issued_at ? inv.issued_at.slice(0, 10) : null,
    dueDate: inv.due_date,
    periodLabel: periodLabel(inv.period_start),
    lines,
    total: Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100,
    note: inv.visible_note,
    filename: invoiceFilename(issued ? inv.number : null, inv.period_start, unit),
  }
}
