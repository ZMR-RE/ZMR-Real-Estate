import type { IssuingEntity } from './agentTypes'

// Invoice/receipt numbering and filenames — OWNER-APPROVED September 30,
// 2026 (recorded in docs/planning/agents/ZMR-T4-agents-workspace-preview.md):
//
//   Invoice number   {CODE}-INV-{NNNNNN}       e.g. EXH-INV-000009
//   Receipt number   {CODE}-RCT-{NNNNNN}       e.g. EXH-RCT-000005
//   Revision         {number}-R{n} (n ≥ 2)     e.g. EXH-INV-000009-R2
//   Invoice file     {number}_{YYYY-MM}_{unit-slug}.pdf
//   Receipt file     {number}_{YYYY-MM-DD}_{unit-slug}.pdf
//
// - One independent sequence per issuing entity AND document type.
// - Continuous; never reset (no annual reset).
// - Numbers are assigned only at issuance; drafts and rejected drafts never
//   consume one. Cancelled or superseded numbers are never reused.
// - {CODE} is each entity's own configurable dashboard value (Entity profile
//   › Invoicing), not fixed in code; the codes here are fictional.
// - Six digits, e.g. A-INV-000001 (the approved width — not five).
// - Issuance is protected per entity AND document type across EVERY path
//   that can issue: assistant drafts, owner-created invoices in Rent ops,
//   revisions and receipts. One run per agent does not cover manual issuance,
//   so protection lives on the sequence itself, not on the agent: see
//   agentIssuance.ts (reserve → commit with a stale-sequence check and a
//   uniqueness guard). The built feature does the same inside one database
//   function that locks the entity × document-type sequence row, plus a
//   unique (account, entity, document type, number) index; no client path
//   may write a number directly.
// - Filenames avoid tenant names (the file travels as an email attachment)
//   and use the unit, which identifies the lease without personal data.

export const NUMBER_DIGITS = 6

export type SequenceKind = 'invoice' | 'receipt'

const TYPE_CODE: Record<SequenceKind, string> = { invoice: 'INV', receipt: 'RCT' }

export function formatDocNumber(entity: IssuingEntity, kind: SequenceKind, seq: number): string {
  return `${entity.shortCode}-${TYPE_CODE[kind]}-${String(seq).padStart(NUMBER_DIGITS, '0')}`
}

export function revisionNumber(baseNumber: string, revision: number): string {
  return revision <= 1 ? baseNumber : `${baseNumber}-R${revision}`
}

export function baseOf(number: string): string {
  return number.replace(/-R\d+$/, '')
}

export function unitSlug(unitLabel: string): string {
  return unitLabel
    .replace(/\bStreet\b/g, 'St')
    .replace(/\bRoad\b/g, 'Rd')
    .replace(/\bLane\b/g, 'Ln')
    .replace(/\bAvenue\b/g, 'Ave')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function documentFilename(number: string, dateKey: string, unitLabel: string): string {
  return `${number}_${dateKey}_${unitSlug(unitLabel)}.pdf`
}

// Why an entity can't issue yet, or null when it can.
export function issueBlocker(entity: IssuingEntity | undefined): string | null {
  if (!entity) return 'Choose which entity issues this document.'
  if (!entity.shortCode) return `${entity.legalName} has no short code for numbering yet.`
  return null
}

export function nextSeq(entity: IssuingEntity, kind: SequenceKind): number {
  return kind === 'invoice' ? entity.nextInvoiceSeq : entity.nextReceiptSeq
}

export function advanceSeq(entities: IssuingEntity[], entityId: string, kind: SequenceKind): IssuingEntity[] {
  return entities.map((e) =>
    e.id !== entityId ? e : kind === 'invoice' ? { ...e, nextInvoiceSeq: e.nextInvoiceSeq + 1 } : { ...e, nextReceiptSeq: e.nextReceiptSeq + 1 },
  )
}
