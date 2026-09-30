import type { DraftContext, RentInvoiceRow } from './rentInvoiceTypes'

// FICTIONAL sample invoice used by the unit tests and the owner-review PDF
// samples (tools/invoice-samples). Not real business data.
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
  amount_due: 1400,
  due_date: '2026-10-01',
  recipient_name: 'Riley Example',
  recipient_email: 'riley@example.com',
  visible_note: 'Thank you — please include the invoice number with your payment.',
  internal_note: 'Checked against lease (never printed)',
  issuer_snapshot: {
    entity_id: 'ent',
    legal_name: 'Example Holdings LLC',
    display_name: 'Example Holdings',
    invoice_code: 'A',
    mailing_address: '100 Main Street',
    mailing_city: 'Springfield',
    mailing_state: 'IL',
    mailing_zip: '62701',
    reply_to: 'billing@example.com',
    payment_instructions: 'Zelle to billing@example.com, or a check payable to Example Holdings LLC mailed to the address above.',
  },
  recipient_snapshot: { name: 'Riley Example', email: 'riley@example.com', property_address: '410 Example Street', unit_label: 'Unit 1' },
  issued_at: '2026-09-25T15:00:00Z',
  created_via: 'assistant',
  invoice_lines: [
    { id: 'l2', line_kind: 'credit', description: 'Credit — September repair reimbursement', amount: -50, sort_order: 1 },
    { id: 'l1', line_kind: 'rent', description: 'Rent — October 2026', amount: 1450, sort_order: 0 },
  ],
}

export const draftContext: DraftContext = {
  issuer: { ...issued.issuer_snapshot!, invoice_code: 'A', payment_instructions: 'CHANGED LATER' },
  propertyAddress: '410 Example Street',
  unitLabel: 'Unit 2',
}
