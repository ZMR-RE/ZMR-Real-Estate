// Row shapes for the Stage 1 invoice records (Rent ops `invoices` extended by
// migrations 20261002100000–20261002160000). Rent ops, the assistant's
// Workload and Approvals all read these same rows.

export type InvoiceState = 'draft' | 'approved' | 'issued' | 'superseded' | 'cancelled' | 'rejected'

export type InvoiceLineKind = 'rent' | 'prorated_rent' | 'charge' | 'credit'

export interface InvoiceLineRow {
  id: string
  line_kind: InvoiceLineKind
  description: string
  amount: number
  sort_order: number
  // Set when the line came from a tenancy billing rule / statement. Those
  // lines are kept by the database when manual lines are edited.
  rule_id: string | null
  statement_id: string | null
}

// A billed person, copied from their tenant profile when the draft was made
// (or refreshed on request). Absent contact fields stay null.
export interface InvoiceRecipient {
  tenant_id: string
  name: string
  email: string | null
  phone: string | null
}

// Exactly what the invoice prints — built by the database
// (invoice_print_snapshot). Approval stores one; issue refuses if the
// current one differs; the issued invoice keeps the approved one forever.
export interface PrintSnapshot {
  issuer: {
    entity_id: string
    legal_name: string
    display_name: string | null
    invoice_code: string | null
    mailing_address: string | null
    mailing_city: string | null
    mailing_state: string | null
    mailing_zip: string | null
  } | null
  branding: {
    heading_color: string | null
    accent_color: string | null
    highlight_color: string | null
    secondary_color: string | null
    reply_to_email: string | null
    document_phone: string | null
    website: string | null
    paper_size: 'letter' | 'a4'
    show_legal_name: boolean
    document_footer: string | null
    logo: { id: string; storage_path: string; sha256: string; format: 'PNG' | 'JPEG'; width: number; height: number } | null
  }
  payment_instructions: { text: string | null; source: 'property' | 'entity' | null }
  recipients: InvoiceRecipient[]
  rental: { property_address: string | null; unit_label: string | null }
  period_start: string
  period_end: string
  due_date: string
  lines: { kind: InvoiceLineKind; description: string; amount: number }[]
  amount_due: number
  note: string | null
  revision: number
  revision_of_number: string | null
  prior_unpaid: { number: string; period_start: string; outstanding: number }[]
}

export type IssuedSnapshot = PrintSnapshot & { number: string; issued_at: string }

export interface RentInvoiceRow {
  id: string
  account_id: string
  property_id: string
  lease_id: string | null
  billing_entity_id: string | null
  state: InvoiceState
  number: string | null
  revision: number
  revision_of: string | null
  version: number
  material_version: number
  approved_material_version: number | null
  period_start: string
  period_end: string
  amount_due: number
  due_date: string
  recipient_name: string | null
  recipients: InvoiceRecipient[]
  visible_note: string | null
  internal_note: string | null
  approved_snapshot: PrintSnapshot | null
  issued_snapshot: IssuedSnapshot | null
  issued_at: string | null
  created_via: 'owner' | 'assistant'
  invoice_lines: InvoiceLineRow[]
}
