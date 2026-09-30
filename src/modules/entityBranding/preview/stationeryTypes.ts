// NON-SAVING PREVIEW — proposed "Branding & documents" settings on the
// EXISTING entity profile (no second issuer record). Awaiting the owner's
// numbered approval; nothing here is stored.

export type ColorRole = 'heading' | 'accent' | 'highlight' | 'secondary'

// Entity stationery: applies ONLY to documents this entity issues. It never
// changes the dashboard's own (workspace-wide) theme.
export interface Stationery {
  logo: { dataUrl: string; format: 'PNG' | 'JPEG'; width: number; height: number; name: string } | null
  colors: Partial<Record<ColorRole, string>>
  contact: { phone: string; website: string }
  defaults: {
    paperSize: 'letter' | 'a4'
    showLegalName: boolean
    invoiceNote: string
    documentFooter: string
    receiptNote: string
  }
}

// Fields that already exist on the entity profile today (Identity and
// Invoicing boxes) — reused, not duplicated.
export interface EntityProfileFields {
  legalName: string
  displayName: string | null
  mailingAddress: string | null
  mailingCity: string | null
  mailingState: string | null
  mailingZip: string | null
  invoiceCode: string | null
  replyTo: string | null
  paymentInstructions: string | null
}

export interface SampleInvoice {
  number: string
  issueDate: string
  dueDate: string
  periodLabel: string
  billTo: { name: string; email: string | null }
  rental: { address: string; unit: string }
  lines: { description: string; amount: number }[]
  note: string | null
}

export interface SampleReceipt {
  number: string
  paymentDate: string
  receivedFrom: string
  method: string
  reference: string | null
  amount: number
  applied: { invoiceNumber: string; periodLabel: string; amount: number; remaining: number }[]
  rental: { address: string; unit: string }
  note: string | null
}
