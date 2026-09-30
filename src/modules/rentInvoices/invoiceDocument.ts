import { EMPTY_STATIONERY } from '../entityBranding/stationeryLogic'
import type { EntityIdentity, InvoiceDoc, Stationery, StationeryLogo } from '../entityBranding/stationeryTypes'
import type { PrintSnapshot } from './rentInvoiceTypes'

// Turns the database's print snapshot into the entity-document renderer's
// inputs (entityBranding/stationeryPdf). The snapshot is the ONLY source:
// a draft previews the current snapshot, an issued invoice prints the one
// it was approved and issued with — later settings changes never alter it.
// Nothing here states that the invoice was sent or paid.

export interface InvoiceRender {
  isDraft: boolean
  entity: EntityIdentity
  stationery: Stationery
  doc: InvoiceDoc
  filename: string
  total: number
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const formatMoney = (value: number): string => MONEY.format(value)
export const formatLongDate = (isoDate: string): string => DATE.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`))
export const periodLabel = (periodStart: string): string => MONTH.format(new Date(`${periodStart.slice(0, 10)}T00:00:00Z`))

// Approved convention: A-INV-000001_2026-10_Unit-1.pdf (unit label only —
// no tenant name, since the file travels as an attachment).
export function unitSlug(unitLabel: string): string {
  return unitLabel.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Unit'
}

export function invoiceFilename(number: string | null, periodStart: string, unitLabel: string): string {
  return `${number ?? 'DRAFT'}_${periodStart.slice(0, 7)}_${unitSlug(unitLabel)}.pdf`
}

// Where the effective payment instructions come from, in words.
export function paymentInstructionsSource(s: PrintSnapshot): string | null {
  const entity = s.issuer ? s.issuer.display_name?.trim() || s.issuer.legal_name : 'the invoicing entity'
  if (s.payment_instructions.source === 'property') return 'This property’s own instructions (overrides the entity default)'
  if (s.payment_instructions.source === 'entity') return `${entity}’s default (Branding & documents)`
  return null
}

export function buildInvoiceRender(
  s: PrintSnapshot,
  issued: { number: string; issuedAt: string } | null,
  logo: StationeryLogo | null,
): InvoiceRender {
  if (!s.issuer) throw new Error('Choose the issuing entity before the invoice can be shown.')
  const b = s.branding
  const unit = s.rental.unit_label ?? ''
  const status = !issued
    ? 'DRAFT — NOT ISSUED'
    : s.revision > 1 && s.revision_of_number
      ? `REVISED — REPLACES ${s.revision_of_number}`
      : null
  const lines = s.lines.map((l) => ({ description: l.description, amount: Number(l.amount) }))
  return {
    isDraft: !issued,
    entity: {
      legalName: s.issuer.legal_name,
      displayName: s.issuer.display_name,
      mailingAddress: s.issuer.mailing_address,
      mailingCity: s.issuer.mailing_city,
      mailingState: s.issuer.mailing_state,
      mailingZip: s.issuer.mailing_zip,
    },
    stationery: {
      ...EMPTY_STATIONERY,
      logo,
      colors: {
        ...(b.heading_color ? { heading: b.heading_color } : {}),
        ...(b.accent_color ? { accent: b.accent_color } : {}),
        ...(b.highlight_color ? { highlight: b.highlight_color } : {}),
        ...(b.secondary_color ? { secondary: b.secondary_color } : {}),
      },
      contact: { replyTo: b.reply_to_email ?? '', phone: b.document_phone ?? '', website: b.website ?? '' },
      paymentInstructions: s.payment_instructions.text ?? '',
      // The note is already resolved in the snapshot (invoice note, else the
      // entity default), so no renderer-side default applies.
      defaults: { ...EMPTY_STATIONERY.defaults, paperSize: b.paper_size, showLegalName: b.show_legal_name, documentFooter: b.document_footer ?? '', invoiceNote: '' },
    },
    doc: {
      number: issued ? issued.number : 'Assigned on issue',
      issueDate: issued ? issued.issuedAt.slice(0, 10) : null,
      status,
      dueDate: s.due_date,
      periodLabel: periodLabel(s.period_start),
      billTo: s.recipients.map((r) => ({ name: r.name, email: r.email, phone: r.phone })),
      rental: { address: s.rental.property_address ?? '', unit },
      lines,
      paymentInstructions: s.payment_instructions.text,
      note: s.note ?? '',
      priorUnpaid: s.prior_unpaid.map((p) => ({
        number: p.number,
        periodLabel: periodLabel(p.period_start),
        outstanding: Number(p.outstanding),
        fromTenancy: p.source === 'continued_tenancy' ? p.tenancy_label : null,
      })),
    },
    filename: invoiceFilename(issued?.number ?? null, s.period_start, unit),
    total: Math.round(lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100,
  }
}

// Printed-content comparison for the approval (mirrors issue_invoice's
// ZM348 check): which parts differ between the approved and current
// snapshot, in the owner's words.
const PART_LABEL: Record<string, string> = {
  issuer: 'issuing entity details',
  branding: 'branding (logo, colours, contact details, footer)',
  payment_instructions: 'payment instructions',
  recipients: 'billed tenants or their contact details',
  rental: 'rental address or unit',
  period_start: 'billing month',
  period_end: 'billing month',
  due_date: 'due date',
  lines: 'lines',
  amount_due: 'amount',
  note: 'note',
  revision: 'revision',
  revision_of_number: 'revision',
  prior_unpaid: 'earlier unpaid invoices listed',
  balance_review: 'earlier balances needing review',
  balance: 'total outstanding',
}

const canonical = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])])) : typeof v === 'number' ? Number(v) : v

export function changedSinceApproval(approved: PrintSnapshot, current: PrintSnapshot): string[] {
  const keys = new Set([...Object.keys(approved), ...Object.keys(current)])
  const parts = [...keys].filter((k) => JSON.stringify(canonical((approved as unknown as Record<string, unknown>)[k])) !== JSON.stringify(canonical((current as unknown as Record<string, unknown>)[k])))
  return [...new Set(parts.map((k) => PART_LABEL[k] ?? k))]
}
