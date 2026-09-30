import type { MockDb } from '../../../devHarness/mockSupabase'

// FICTIONAL review data for the SIMULATED-backend review page only
// (rent-invoices-review.html). Discarded on reload; never sent anywhere.

export const REVIEW_ACCOUNT = 'review-account'
const A = REVIEW_ACCOUNT

export function buildReviewDb(): MockDb {
  return {
    llcs: [
      { id: 'ent-a', account_id: A, archived: false, name: 'Example Holdings LLC', display_name: 'Example Holdings', invoice_code: 'A', mailing_address: '100 Main Street', mailing_city: 'Springfield', mailing_state: 'IL', mailing_zip: '62701', billing_reply_to_email: 'billing@example.com', payment_instructions: 'Zelle to billing@example.com, or a check payable to Example Holdings LLC mailed to the address above.' },
      { id: 'ent-srp', account_id: A, archived: false, name: 'Sample Road Properties LLC', display_name: null, invoice_code: 'SRP', mailing_address: '27 Sample Road', mailing_city: 'Springfield', mailing_state: 'IL', mailing_zip: '62702', billing_reply_to_email: null, payment_instructions: 'Check payable to Sample Road Properties LLC.' },
      { id: 'ent-pp', account_id: A, archived: false, name: 'Placeholder Partners LLC', display_name: null, invoice_code: null, mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null, billing_reply_to_email: null, payment_instructions: null },
    ],
    properties: [
      { id: 'prop-410', account_id: A, name: null, address: '410 Example Street', billing_entity_id: 'ent-a' },
      { id: 'prop-27', account_id: A, name: null, address: '27 Sample Road', billing_entity_id: 'ent-srp' },
      { id: 'prop-9', account_id: A, name: null, address: '9 Placeholder Lane', billing_entity_id: null },
    ],
    units: [
      { id: 'unit-1', property_id: 'prop-410', unit_label: 'Unit 1' },
      { id: 'unit-2', property_id: 'prop-410', unit_label: 'Unit 2' },
      { id: 'unit-a', property_id: 'prop-27', unit_label: 'Unit A' },
      { id: 'unit-main', property_id: 'prop-9', unit_label: 'Main' },
    ],
    tenants: [
      { id: 't-riley', name: 'Riley Example', email: 'riley@example.com' },
      { id: 't-jordan', name: 'Jordan Sample', email: 'jordan@example.com' },
      { id: 't-sam', name: 'Sam Sample', email: null },
      { id: 't-casey', name: 'Casey Placeholder', email: 'casey@example.com' },
      { id: 't-morgan', name: 'Morgan Demo', email: null },
    ],
    leases: [
      { id: 'lease-riley', account_id: A, archived: false, property_id: 'prop-410', unit_id: 'unit-1', rent_amount: 1450, start_date: '2026-01-01', end_date: '2026-12-31' },
      { id: 'lease-jordan', account_id: A, archived: false, property_id: 'prop-410', unit_id: 'unit-2', rent_amount: 1395, start_date: '2026-10-15', end_date: null },
      { id: 'lease-casey', account_id: A, archived: false, property_id: 'prop-27', unit_id: 'unit-a', rent_amount: 1720, start_date: '2025-08-01', end_date: null },
      { id: 'lease-morgan', account_id: A, archived: false, property_id: 'prop-9', unit_id: 'unit-main', rent_amount: null, start_date: '2026-06-01', end_date: null },
    ],
    lease_tenants: [
      { lease_id: 'lease-riley', tenant_id: 't-riley', is_billing_recipient: true },
      { lease_id: 'lease-jordan', tenant_id: 't-jordan', is_billing_recipient: true },
      { lease_id: 'lease-jordan', tenant_id: 't-sam', is_billing_recipient: true },
      { lease_id: 'lease-casey', tenant_id: 't-casey', is_billing_recipient: true },
      { lease_id: 'lease-morgan', tenant_id: 't-morgan', is_billing_recipient: false },
    ],
    lease_billing_terms: [
      { lease_id: 'lease-riley', due_day: 1, prorate_rule: 'none', effective_from: null, effective_to: null },
      { lease_id: 'lease-jordan', due_day: 31, prorate_rule: 'daily', effective_from: null, effective_to: null },
      { lease_id: 'lease-casey', due_day: 5, prorate_rule: 'none', effective_from: null, effective_to: null },
    ],
    document_sequences: [
      { entity_id: 'ent-a', doc_type: 'invoice', next_value: 1 },
      { entity_id: 'ent-srp', doc_type: 'invoice', next_value: 1 },
    ],
    invoices: [
      // An earlier invoice made before Stage 1: issued, never numbered.
      { id: 'inv-legacy', account_id: A, property_id: 'prop-410', lease_id: null, billing_entity_id: null, state: 'issued', number: null, revision: 1, revision_of: null, version: 1, material_version: 1, approved_material_version: null, period_start: '2026-09-01', period_end: '2026-09-30', amount_due: 1450, due_date: '2026-09-01', billed_to: 'Riley Example', notes: null, recipient_name: 'Riley Example', recipient_email: null, visible_note: null, internal_note: null, issuer_snapshot: null, recipient_snapshot: null, issued_at: null, created_via: 'owner' },
    ],
    invoice_lines: [],
    invoice_events: [],
    payments: [{ id: 'pay-legacy', invoice_id: 'inv-legacy', amount: 1450, paid_date: '2026-09-01', method: 'Zelle', notes: null }],
    documents: [],
  }
}
