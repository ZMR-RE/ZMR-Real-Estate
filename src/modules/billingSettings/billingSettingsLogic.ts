import type { BillingTermsInput, BillingTermsRow, ContinuityOption, EntityInvoicingInput } from './billingSettingsQueries'

// Pure helpers for the billing settings boxes (no Supabase, no React).

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${s}`
}

export function dueDayLabel(day: number): string {
  return day >= 29 ? `${ordinal(day)} of each month (last day in shorter months)` : `${ordinal(day)} of each month`
}

export const PRORATE_LABEL: Record<BillingTermsRow['prorate_rule'], string> = {
  none: 'Charge the full month',
  daily: 'Prorate by day (rent × days ÷ days in month)',
  manual: 'I’ll enter the partial-month amount',
}

export interface TermsFormValues {
  dueDay: string
  effectiveFrom: string
  effectiveTo: string
  prorateRule: BillingTermsRow['prorate_rule']
  prorateNotes: string
  continuesLeaseId: string
}

export function termsFormFrom(t: BillingTermsRow | null): TermsFormValues {
  return {
    dueDay: t?.due_day != null ? String(t.due_day) : '',
    effectiveFrom: t?.effective_from ?? '',
    effectiveTo: t?.effective_to ?? '',
    prorateRule: t?.prorate_rule ?? 'none',
    prorateNotes: t?.prorate_notes ?? '',
    continuesLeaseId: t?.continues_lease_id ?? '',
  }
}

export function validateTerms(v: TermsFormValues): string[] {
  const errors: string[] = []
  if (!v.dueDay) errors.push('Choose the rent due day.')
  if (v.effectiveFrom && v.effectiveTo && v.effectiveTo < v.effectiveFrom) errors.push('Billing can’t end before it starts.')
  return errors
}

export function termsInputFrom(v: TermsFormValues): BillingTermsInput {
  return {
    due_day: v.dueDay ? Number(v.dueDay) : null,
    effective_from: v.effectiveFrom || null,
    effective_to: v.effectiveTo || null,
    prorate_rule: v.prorateRule,
    prorate_notes: v.prorateNotes.trim() || null,
    continues_lease_id: v.continuesLeaseId || null,
  }
}

// Same format the database enforces (llcs_invoice_code_format).
export function normalizeInvoiceCode(raw: string): string {
  return raw.trim().toUpperCase()
}

export function validateEntityInvoicing(input: EntityInvoicingInput, startNumber: string, startEditable: boolean): string[] {
  const errors: string[] = []
  if (input.invoice_code && !/^[A-Z0-9]{1,8}$/.test(input.invoice_code)) errors.push('Invoice code: 1–8 letters or digits, no spaces.')
  if (startEditable && startNumber.trim() !== '' && (!/^\d+$/.test(startNumber.trim()) || Number(startNumber) < 1)) errors.push('Starting number must be a whole number of 1 or more.')
  return errors
}

// Six-digit minimum, never truncated (mirrors format_document_number).
export function previewInvoiceNumber(code: string | null, next: number): string | null {
  if (!code) return null
  const digits = String(next)
  return `${code}-INV-${digits.padStart(Math.max(6, digits.length), '0')}`
}

// Which payment instructions a property's invoices print, and why.
export function effectivePaymentInstructions(override: string | null, entityDefault: string | null, entityName: string | null) {
  const own = override?.trim() || null
  if (own) return { text: own, source: entityName ? 'This property’s own instructions (overrides the issuer’s default)' : 'This property’s own instructions' }
  const inherited = entityDefault?.trim() || null
  if (inherited) return { text: inherited, source: `Inherited from ${entityName ?? 'the invoice issuer'}’s default (Branding & documents)` }
  return { text: null, source: null }
}

// The invoice issuer is any owner record: a person or a business. Shows
// which, when the owner's profile says; never guessed from the name.
export function issuerKindLabel(kind: 'individual' | 'entity' | null): string | null {
  return kind === 'individual' ? 'Person' : kind === 'entity' ? 'Business' : null
}

export function issuerOptionLabel(o: { name: string; display_name: string | null; invoice_code: string | null; owner_kind: 'individual' | 'entity' | null }): string {
  const kind = issuerKindLabel(o.owner_kind)
  return `${o.display_name || o.name}${kind ? ` — ${kind.toLowerCase()}` : ''}${o.invoice_code ? ` (${o.invoice_code})` : ''}`
}

// Owner records with the same name as a person being added. Offered, never
// forced: two different people may share a name.
export function issuersNamed<T extends { name: string; display_name: string | null }>(options: T[], name: string): T[] {
  const norm = (n: string) => n.trim().replace(/\s+/g, ' ').toLowerCase()
  const key = norm(name)
  return key ? options.filter((o) => norm(o.name) === key || (o.display_name !== null && norm(o.display_name) === key)) : []
}

export function continuityLabel(o: ContinuityOption): string {
  const names = o.lease_tenants.map((lt) => lt.tenant?.name).filter(Boolean).join(' & ')
  const dates = `${o.start_date}${o.end_date ? ` to ${o.end_date}` : ' onward'}`
  return `${o.property?.address ?? 'Property'} — ${o.unit?.unit_label ?? 'Unit'} · ${dates}${names ? ` · ${names}` : ''}`
}

// Only tenancies that started before this one can be continued from.
export const continuityChoices = (all: ContinuityOption[], leaseId: string, startDate: string) =>
  all.filter((o) => o.id !== leaseId && o.start_date < startDate)
