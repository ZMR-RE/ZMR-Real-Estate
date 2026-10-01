import type { InvoiceLineInput, InvoicePatch, TenancyOptionRow } from './rentInvoicesQueries'
import type { InvoiceLineKind, InvoiceLineRow, RentInvoiceRow } from './rentInvoiceTypes'

// Pure helpers for the Rent ops invoice workflow (no Supabase, no React).

export function tenancyLabel(t: TenancyOptionRow): string {
  const names = t.lease_tenants.map((lt) => lt.tenant?.name).filter(Boolean).join(' & ')
  const where = `${t.property?.address ?? 'Property'} — ${t.unit?.unit_label ?? 'Unit'}`
  return names ? `${where} · ${names}` : where
}

// <input type="month"> value → first day of that month.
export function periodFromMonth(month: string): string | null {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? `${month}-01` : null
}

export function nextMonth(today: Date): string {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1))
  return d.toISOString().slice(0, 7)
}

// Lines from tenancy billing rules are maintained by the rules (and kept by
// the database on edit); only manual lines are edited on the invoice.
export const isRuleLine = (l: Pick<InvoiceLineRow, 'rule_id'>): boolean => l.rule_id !== null

const sortedLines = (inv: RentInvoiceRow) => [...inv.invoice_lines].sort((a, b) => a.sort_order - b.sort_order)
export const ruleLinesOf = (inv: RentInvoiceRow) => sortedLines(inv).filter(isRuleLine)

export interface LineDraft {
  line_kind: InvoiceLineKind
  description: string
  amount: string
}

export interface InvoiceEditValues {
  dueDate: string
  issuerId: string
  refreshRecipients: boolean
  visibleNote: string
  internalNote: string
  lines: LineDraft[]
}

export function editValuesFrom(inv: RentInvoiceRow): InvoiceEditValues {
  return {
    dueDate: inv.due_date,
    issuerId: inv.billing_entity_id ?? '',
    refreshRecipients: false,
    visibleNote: inv.visible_note ?? '',
    internalNote: inv.internal_note ?? '',
    lines: sortedLines(inv).filter((l) => !isRuleLine(l)).map((l) => ({ line_kind: l.line_kind, description: l.description, amount: Number(l.amount).toFixed(2) })),
  }
}

export function validateEdit(v: InvoiceEditValues, ruleTotal = 0, ruleLineCount = 0): string[] {
  const errors: string[] = []
  if (!v.dueDate) errors.push('Due date is required.')
  if (v.lines.length + ruleLineCount === 0) errors.push('Add at least one line.')
  v.lines.forEach((l, i) => {
    const n = Number(l.amount)
    if (!l.description.trim()) errors.push(`Line ${i + 1} needs a description.`)
    if (l.amount.trim() === '' || !Number.isFinite(n)) errors.push(`Line ${i + 1} needs an amount.`)
    else if (l.line_kind === 'credit' ? n >= 0 : n < 0) errors.push(`Line ${i + 1}: credits are negative, charges are positive.`)
  })
  const total = v.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0) + ruleTotal
  if (total < 0) errors.push('Credits can’t exceed the charges.')
  return errors
}

// Only the fields that actually changed are sent, so an internal-note-only
// edit is never treated as material by the database.
export function buildPatch(inv: RentInvoiceRow, v: InvoiceEditValues): InvoicePatch {
  const before = editValuesFrom(inv)
  const patch: InvoicePatch = {}
  if (v.dueDate !== before.dueDate) patch.due_date = v.dueDate
  if (v.issuerId !== before.issuerId) patch.billing_entity_id = v.issuerId || null
  if (v.refreshRecipients) patch.refresh_recipients = true
  if (v.visibleNote.trim() !== before.visibleNote) patch.visible_note = v.visibleNote.trim() || null
  if (v.internalNote.trim() !== before.internalNote) patch.internal_note = v.internalNote.trim() || null
  const norm = (ls: LineDraft[]): InvoiceLineInput[] => ls.map((l) => ({ line_kind: l.line_kind, description: l.description.trim(), amount: Math.round(Number(l.amount) * 100) / 100 }))
  if (JSON.stringify(norm(v.lines)) !== JSON.stringify(norm(before.lines))) patch.lines = norm(v.lines)
  return patch
}

export function patchIsMaterial(patch: InvoicePatch): boolean {
  return Object.keys(patch).some((k) => k !== 'internal_note')
}

export const STATE_LABEL: Record<RentInvoiceRow['state'], string> = {
  draft: 'Draft',
  approved: 'Approved — ready to issue',
  issued: 'Issued',
  superseded: 'Superseded (kept)',
  cancelled: 'Cancelled (number kept)',
  rejected: 'Rejected',
}

// Which details panel an invoice opens in: drafts and approved invoices are
// reviewed; numbered issued, superseded and cancelled ones are read-only.
// Anything else (a rejected draft) shows no panel.
export function detailPanelFor(inv: Pick<RentInvoiceRow, 'state' | 'number'>): 'review' | 'issued' | null {
  if (inv.state === 'draft' || inv.state === 'approved') return 'review'
  if (inv.number && (inv.state === 'issued' || inv.state === 'superseded' || inv.state === 'cancelled')) return 'issued'
  return null
}

// Revise and Cancel are offered only while an issued invoice is live.
export function issuedActionsOpen(inv: Pick<RentInvoiceRow, 'state'>): boolean {
  return inv.state === 'issued'
}
