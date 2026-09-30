import type { PrintSnapshot, RentInvoiceRow } from './rentInvoiceTypes'

// FICTIONAL sample invoice used by the unit tests and the owner-review PDF
// samples (tools/invoice-samples). Not real business data.
export const snapshot: PrintSnapshot = {
  issuer: {
    entity_id: 'ent',
    legal_name: 'Example Holdings LLC',
    display_name: 'Example Holdings',
    invoice_code: 'A',
    mailing_address: '100 Main Street',
    mailing_city: 'Springfield',
    mailing_state: 'IL',
    mailing_zip: '62701',
  },
  branding: {
    heading_color: '#1F4E79',
    accent_color: '#C99730',
    highlight_color: '#1F4E79',
    secondary_color: '#5B6472',
    reply_to_email: 'billing@example.com',
    document_phone: '(555) 010-2030',
    website: null,
    paper_size: 'letter',
    show_legal_name: true,
    document_footer: 'Please include the invoice number with your payment.',
    logo: null,
  },
  payment_instructions: { text: 'Zelle to billing@example.com, or a check payable to Example Holdings LLC mailed to the address above.', source: 'entity' },
  recipients: [
    { tenant_id: 't1', name: 'Riley Example', email: 'riley@example.com', phone: '(555) 010-1111' },
  ],
  rental: { property_address: '410 Example Street', unit_label: 'Unit 1' },
  period_start: '2026-10-01',
  period_end: '2026-10-31',
  due_date: '2026-10-01',
  lines: [
    { kind: 'rent', description: 'Rent — October 2026', amount: 1450 },
    { kind: 'charge', description: 'Pest control (50% of $120.00)', amount: 60 },
    { kind: 'credit', description: 'Credit — September repair reimbursement', amount: -50 },
  ],
  amount_due: 1460,
  note: 'Thank you!',
  revision: 1,
  revision_of_number: null,
  prior_unpaid: [],
}

export const issued: RentInvoiceRow = {
  id: 'inv-1',
  account_id: 'acc',
  property_id: 'prop',
  lease_id: 'lease',
  billing_entity_id: 'ent',
  state: 'issued',
  number: 'A-INV-000001',
  revision: 1,
  revision_of: null,
  version: 4,
  material_version: 2,
  approved_material_version: 2,
  period_start: '2026-10-01',
  period_end: '2026-10-31',
  amount_due: 1460,
  due_date: '2026-10-01',
  recipient_name: 'Riley Example',
  recipients: snapshot.recipients,
  visible_note: 'Thank you!',
  internal_note: 'Checked against lease (never printed)',
  approved_snapshot: snapshot,
  issued_snapshot: { ...snapshot, number: 'A-INV-000001', issued_at: '2026-09-25T15:00:00Z' },
  issued_at: '2026-09-25T15:00:00Z',
  created_via: 'assistant',
  invoice_lines: [
    { id: 'l3', line_kind: 'credit', description: 'Credit — September repair reimbursement', amount: -50, sort_order: 2, rule_id: null, statement_id: null },
    { id: 'l1', line_kind: 'rent', description: 'Rent — October 2026', amount: 1450, sort_order: 0, rule_id: null, statement_id: null },
    { id: 'l2', line_kind: 'charge', description: 'Pest control (50% of $120.00)', amount: 60, sort_order: 1, rule_id: 'rule-1', statement_id: null },
  ],
}

export const draft: RentInvoiceRow = { ...issued, state: 'draft', number: null, approved_snapshot: null, issued_snapshot: null, issued_at: null }
