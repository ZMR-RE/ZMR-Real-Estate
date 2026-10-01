import type { MockDb } from '../../../devHarness/mockSupabase'

// FICTIONAL review data for the SIMULATED-backend review page only
// (rent-invoices-review.html). Discarded on reload; never sent anywhere.

export const REVIEW_ACCOUNT = 'review-account'
const A = REVIEW_ACCOUNT

export function buildReviewDb(): MockDb {
  return {
    llcs: [
      { id: 'ent-a', account_id: A, archived: false, name: 'Example Holdings LLC', display_name: 'Example Holdings', invoice_code: 'A', mailing_address: '100 Main Street', mailing_city: 'Springfield', mailing_state: 'IL', mailing_zip: '62701' },
      { id: 'ent-srp', account_id: A, archived: false, name: 'Sample Road Properties LLC', display_name: null, invoice_code: 'SRP', mailing_address: '27 Sample Road', mailing_city: 'Springfield', mailing_state: 'IL', mailing_zip: '62702' },
      { id: 'ent-pp', account_id: A, archived: false, name: 'Placeholder Partners LLC', display_name: null, invoice_code: null, mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null },
    ],
    // Issuer contact details, colours, logo and DEFAULT payment instructions
    // (Settings › Entities › Branding & documents). SRP has no logo.
    entity_document_branding: [
      { entity_id: 'ent-a', account_id: A, heading_color: '#1F4E79', accent_color: '#C99730', highlight_color: '#1F4E79', secondary_color: '#5B6472', reply_to_email: 'billing@example.com', document_phone: '(555) 010-2030', website: null, payment_instructions: 'Zelle to billing@example.com, or a check payable to Example Holdings LLC mailed to the address above.', paper_size: 'letter', show_legal_name: true, default_invoice_note: null, document_footer: 'Please include the invoice number with your payment.', current_logo_id: 'logo-a-1' },
      { entity_id: 'ent-srp', account_id: A, heading_color: null, accent_color: null, highlight_color: null, secondary_color: null, reply_to_email: null, document_phone: null, website: null, payment_instructions: 'Check payable to Sample Road Properties LLC.', paper_size: 'letter', show_legal_name: true, default_invoice_note: 'Rent is due by the 5th.', document_footer: null, current_logo_id: null },
    ],
    // sha256 is filled in by reviewSupabaseClient when it stores the file.
    entity_logo_versions: [
      { id: 'logo-a-1', entity_id: 'ent-a', account_id: A, storage_path: `${A}/entity-branding/ent-a/logo-1.png`, sha256: '', format: 'PNG', width: 240, height: 80 },
    ],
    properties: [
      { id: 'prop-410', account_id: A, name: null, address: '410 Example Street', billing_entity_id: 'ent-a', payment_instructions_override: null },
      // This property's own instructions override SRP's default.
      { id: 'prop-27', account_id: A, name: null, address: '27 Sample Road', billing_entity_id: 'ent-srp', payment_instructions_override: 'Check payable to Sample Road Properties LLC, dropped in the locked box at the site office.' },
      { id: 'prop-9', account_id: A, name: null, address: '9 Placeholder Lane', billing_entity_id: null, payment_instructions_override: null },
    ],
    units: [
      { id: 'unit-1', property_id: 'prop-410', unit_label: 'Unit 1' },
      { id: 'unit-2', property_id: 'prop-410', unit_label: 'Unit 2' },
      { id: 'unit-a', property_id: 'prop-27', unit_label: 'Unit A' },
      { id: 'unit-main', property_id: 'prop-9', unit_label: 'Main' },
    ],
    tenants: [
      { id: 't-riley', name: 'Riley Example', email: 'riley@example.com', phone: '(555) 010-1111' },
      { id: 't-jordan', name: 'Jordan Sample', email: 'jordan@example.com', phone: null },
      { id: 't-sam', name: 'Sam Sample', email: null, phone: '(555) 010-3333' },
      { id: 't-casey', name: 'Casey Placeholder', email: 'casey@example.com', phone: null },
      { id: 't-morgan', name: 'Morgan Demo', email: null, phone: null },
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
    // Billing rules on the Sample Road tenancy (fictional): a fixed half-share
    // of a $120 monthly cost, and half of a variable gas bill billed only
    // from an entered statement (October's is entered; none is estimated).
    tenancy_charge_rules: [
      { id: 'rule-pest', account_id: A, lease_id: 'lease-casey', kind: 'fixed_recurring', description: 'Pest control', amount: 60, basis_total: 120, share_percent: 50, effective_from: '2026-10-01', effective_to: null, one_time_period: null, applied_invoice_id: null, status: 'active', version: 1 },
      { id: 'rule-gas', account_id: A, lease_id: 'lease-casey', kind: 'variable_statement', description: 'Gas', amount: null, basis_total: null, share_percent: 50, effective_from: '2026-10-01', effective_to: null, one_time_period: null, applied_invoice_id: null, status: 'active', version: 1 },
    ],
    tenancy_charge_statements: [
      { id: 'stmt-gas-oct', account_id: A, rule_id: 'rule-gas', service_period_start: '2026-10-01', statement_amount: 84.2, document_id: null, billed_invoice_id: null },
    ],
    document_sequences: [
      { entity_id: 'ent-a', doc_type: 'invoice', next_value: 1 },
      { entity_id: 'ent-srp', doc_type: 'invoice', next_value: 1 },
    ],
    invoices: [
      // An earlier invoice made before Stage 1: issued, never numbered.
      { id: 'inv-legacy', account_id: A, property_id: 'prop-410', lease_id: null, billing_entity_id: null, state: 'issued', number: null, revision: 1, revision_of: null, version: 1, material_version: 1, approved_material_version: null, period_start: '2026-09-01', period_end: '2026-09-30', amount_due: 1450, due_date: '2026-09-01', billed_to: 'Riley Example', notes: null, recipient_name: 'Riley Example', recipients: [], visible_note: null, internal_note: null, approved_snapshot: null, issued_snapshot: null, issued_at: null, created_via: 'owner' },
    ],
    invoice_lines: [],
    invoice_events: [],
    payments: [{ id: 'pay-legacy', invoice_id: 'inv-legacy', amount: 1450, paid_date: '2026-09-01', method: 'Zelle', notes: null }],
    documents: [],
  }
}
