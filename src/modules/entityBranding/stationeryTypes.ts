// Entity branding & documents (owner-approved: logo, four optional colour
// roles, issuer/contact details, document defaults). Stored on the EXISTING
// entity (llcs) via a one-to-one entity_document_branding row. Applies only
// to documents the entity issues — never the workspace theme.

export type ColorRole = 'heading' | 'accent' | 'highlight' | 'secondary'

export interface StationeryLogo {
  dataUrl: string
  format: 'PNG' | 'JPEG'
  width: number
  height: number
  name: string
}

export interface Stationery {
  logo: StationeryLogo | null
  colors: Partial<Record<ColorRole, string>>
  contact: { replyTo: string; phone: string; website: string }
  // Entity default; a property may override it (Stage 1 Billing settings).
  paymentInstructions: string
  defaults: {
    paperSize: 'letter' | 'a4'
    showLegalName: boolean
    invoiceNote: string
    documentFooter: string
    receiptNote: string
  }
}

// Identity fields the entity profile already holds (reused, not copied).
export interface EntityIdentity {
  legalName: string
  displayName: string | null
  mailingAddress: string | null
  mailingCity: string | null
  mailingState: string | null
  mailingZip: string | null
}

// A billed person, from their existing tenant profile. Absent contact
// fields are simply omitted on the document.
export interface BilledPerson {
  name: string
  email: string | null
  phone: string | null
}

export interface InvoiceDoc {
  number: string
  issueDate: string
  dueDate: string
  periodLabel: string
  billTo: BilledPerson[]
  rental: { address: string; unit: string }
  lines: { description: string; amount: number }[]
  // Effective instructions for this invoice (property override, else the
  // entity default) — resolved before approval and snapshotted at issue.
  paymentInstructions: string | null
  note: string | null
  // Earlier unpaid invoices shown as references only — never billed again.
  priorUnpaid: { number: string; periodLabel: string; outstanding: number }[]
}

export interface ReceiptDoc {
  number: string
  paymentDate: string
  receivedFrom: BilledPerson[]
  method: string
  reference: string | null
  amount: number
  applied: { invoiceNumber: string; periodLabel: string; amount: number; remaining: number }[]
  rental: { address: string; unit: string }
  note: string | null
}
