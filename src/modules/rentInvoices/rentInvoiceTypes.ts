// Row shapes for the Stage 1 invoice records (Rent ops `invoices` extended by
// migrations 20261002100000–20261002130000). Rent ops, the assistant's
// Workload and Approvals all read these same rows.

export type InvoiceState = 'draft' | 'approved' | 'issued' | 'superseded' | 'cancelled' | 'rejected'

export type InvoiceLineKind = 'rent' | 'prorated_rent' | 'charge' | 'credit'

export interface InvoiceLineRow {
  id: string
  line_kind: InvoiceLineKind
  description: string
  amount: number
  sort_order: number
}

export interface IssuerSnapshot {
  entity_id: string
  legal_name: string
  display_name: string | null
  invoice_code: string
  mailing_address: string | null
  mailing_city: string | null
  mailing_state: string | null
  mailing_zip: string | null
  reply_to: string | null
  payment_instructions: string | null
}

export interface RecipientSnapshot {
  name: string | null
  email: string | null
  property_address: string | null
  unit_label: string | null
}

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
  recipient_email: string | null
  visible_note: string | null
  internal_note: string | null
  issuer_snapshot: IssuerSnapshot | null
  recipient_snapshot: RecipientSnapshot | null
  issued_at: string | null
  created_via: 'owner' | 'assistant'
  invoice_lines: InvoiceLineRow[]
}

// Current (unsnapshotted) values used only to preview a DRAFT.
export interface DraftContext {
  issuer: Omit<IssuerSnapshot, 'entity_id' | 'invoice_code'> & { invoice_code: string | null }
  propertyAddress: string
  unitLabel: string
}
