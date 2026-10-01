import type { DutyId, TenantAssignment } from './agentTypes'

// Every field the Rent & Payments Assistant reads or writes, mapped to its
// DASHBOARD HOME — where the owner sees and edits it. Existing fields were
// read from current source/migrations (September 30, 2026). Missing fields
// are proposals, not approved schema; each names the existing record it
// would extend (reuse first — no parallel agent ledger or document copies).

export type InputSource =
  | { kind: 'existing'; field: string; home: string }
  | { kind: 'missing'; proposedField: string; home: string; reuse: string }

export interface InputRequirement {
  id: string
  label: string
  group: 'Tenant & lease' | 'Issuer & numbering' | 'Invoices & receipts' | 'Payments' | 'Assistant' | 'Delivery'
  duties: DutyId[]
  source: InputSource
}

const E = (field: string, home: string): InputSource => ({ kind: 'existing', field, home })
const M = (proposedField: string, home: string, reuse: string): InputSource => ({ kind: 'missing', proposedField, home, reuse })

export const INPUT_REQUIREMENTS: InputRequirement[] = [
  // Tenant & lease
  { id: 'tenant_name', group: 'Tenant & lease', label: 'Tenant name', duties: ['invoices', 'receipts', 'reminders'], source: E('tenants.name', 'Tenant profile') },
  { id: 'unit', group: 'Tenant & lease', label: 'Property address and unit', duties: ['invoices', 'receipts', 'reminders'], source: E('properties.address, units.label (via leases.unit_id)', 'Property › Overview › Units') },
  { id: 'lease_active', group: 'Tenant & lease', label: 'Active lease and dates', duties: ['invoices', 'reminders'], source: E('leases.start_date / end_date', 'Property › Overview › Units › Lease') },
  { id: 'lease_rent', group: 'Tenant & lease', label: 'Monthly rent', duties: ['invoices', 'partial_payments'], source: E('leases.rent_amount', 'Property › Overview › Units › Lease') },
  { id: 'late_fee', group: 'Tenant & lease', label: 'Late fee', duties: ['reminders'], source: E('leases.late_fee', 'Property › Overview › Units › Lease') },
  { id: 'rent_due_day', group: 'Tenant & lease', label: 'Rent due day', duties: ['invoices', 'reminders'], source: M('Rent due day', 'Property › Overview › Units › Lease', 'New column on leases') },
  { id: 'grace_period', group: 'Tenant & lease', label: 'Grace period before a reminder', duties: ['reminders'], source: M('Grace period (days)', 'Property › Overview › Units › Lease', 'New column on leases') },
  { id: 'payer', group: 'Tenant & lease', label: 'Billing contact on a shared lease', duties: ['invoices', 'payment_notices'], source: M('Billing contact', 'Property › Overview › Units › Lease', 'Flag on existing lease_tenants row') },

  // Issuer & numbering
  { id: 'owners', group: 'Issuer & numbering', label: 'Property owners', duties: ['invoices', 'receipts'], source: E('property_ownership_interests → llcs', 'Property › Overview › Ownership') },
  { id: 'entity_identity', group: 'Issuer & numbering', label: 'Issuer legal name and mailing address', duties: ['invoices', 'receipts'], source: E('llcs.name / display_name / mailing_address…', 'Entity profile › Identity') },
  { id: 'issuer_choice', group: 'Issuer & numbering', label: 'Issuer when a property has several owners', duties: ['invoices', 'receipts'], source: M('Invoice issuer', 'Property › Overview › Units › Lease (defaults from sole owner)', 'Reference to existing llcs row on leases') },
  { id: 'entity_code', group: 'Issuer & numbering', label: 'Issuer short code', duties: ['invoices', 'receipts'], source: M('Numbering short code', 'Entity profile › Invoicing', 'New column on llcs') },
  { id: 'sequences', group: 'Issuer & numbering', label: 'Independent invoice and receipt sequences per issuer', duties: ['invoices', 'receipts'], source: M('Next invoice / receipt number', 'Entity profile › Invoicing', 'New per-entity sequence table (one row per entity × document type)') },

  // Invoices & receipts
  { id: 'invoice_core', group: 'Invoices & receipts', label: 'Invoice amount, period and due date', duties: ['invoices', 'partial_payments', 'reminders'], source: E('invoices.amount_due / period_start / period_end / due_date / notes', 'Rent ops') },
  { id: 'invoice_link', group: 'Invoices & receipts', label: 'Invoice’s tenant, lease and issuer', duties: ['invoices', 'payment_notices', 'reminders'], source: M('Tenant, lease and issuer on each invoice (today only free-text “Billed to”)', 'Rent ops invoice', 'New columns on invoices') },
  { id: 'invoice_state', group: 'Invoices & receipts', label: 'Draft / approved / issued / superseded state', duties: ['invoices'], source: M('Invoice state', 'Rent ops invoice (Approvals is a filter of it)', 'New column on invoices — drafts live in the same table') },
  { id: 'invoice_number', group: 'Invoices & receipts', label: 'Invoice number', duties: ['invoices'], source: M('Invoice number', 'Rent ops invoice', 'New column on invoices, assigned at issue') },
  { id: 'revisions', group: 'Invoices & receipts', label: 'Revision chain', duties: ['invoices', 'receipts'], source: M('Revision number and “revision of”', 'Rent ops invoice / receipt', 'New columns on invoices and receipts') },
  { id: 'versions', group: 'Invoices & receipts', label: 'Edit version (detects edits during a run)', duties: ['invoices', 'receipts'], source: M('Version counter', 'Not shown — shown only as a conflict notice', 'Same pattern as property_ownership_versions') },
  { id: 'approval', group: 'Invoices & receipts', label: 'Approved version and approver', duties: ['invoices', 'receipts'], source: M('Approved-at version, approver, time', 'Approvals', 'New columns on invoices and receipts') },
  { id: 'receipts', group: 'Invoices & receipts', label: 'Receipt record per payment', duties: ['receipts'], source: M('Receipt', 'Rent ops › payment', 'New receipts table referencing payments') },
  { id: 'pdfs', group: 'Invoices & receipts', label: 'Issued PDF per revision', duties: ['invoices', 'receipts'], source: M('Invoice / receipt link on documents', 'Rent ops › invoice › Documents', 'Existing documents table + Storage; add invoice_id / receipt_id') },

  // Payments
  { id: 'payments', group: 'Payments', label: 'Payment events (each one separate)', duties: ['partial_payments', 'receipts'], source: E('payments.amount / paid_date / method / notes', 'Rent ops › Record payment') },
  { id: 'allocations', group: 'Payments', label: 'How a payment splits across invoices', duties: ['partial_payments'], source: M('Payment allocations', 'Rent ops › payment', 'New allocation rows; today payments.invoice_id allows one invoice only') },
  { id: 'payment_payer', group: 'Payments', label: 'Tenant who paid', duties: ['payment_notices', 'partial_payments'], source: M('Tenant on each payment', 'Rent ops › payment', 'New column on payments') },
  { id: 'payment_reference', group: 'Payments', label: 'Payment reference (duplicate check)', duties: ['payment_notices'], source: M('Reference / confirmation number', 'Rent ops › payment', 'New column on payments') },
  { id: 'ledger_link', group: 'Payments', label: 'Rent payment ↔ Financials entry', duties: ['partial_payments'], source: M('Financial transaction link', 'Rent ops › payment and Financials', 'Link to existing financial_transactions (which already has tenant_id)') },
  { id: 'notices', group: 'Payments', label: 'Payment notifications (evidence)', duties: ['payment_notices'], source: M('Payment notice', 'Agents › Approvals', 'New evidence rows; source mailbox is Command center') },

  // Assistant
  { id: 'assignments', group: 'Assistant', label: 'Workload assignments (tenants served)', duties: ['invoices', 'payment_notices', 'receipts', 'reminders'], source: M('Assistant assignment', 'Agents › Overview › Tenant assignments', 'New rows referencing existing leases/tenants') },
  { id: 'reminders', group: 'Assistant', label: 'Reminder approval item', duties: ['reminders'], source: M('Reminder item', 'Action queue (per Notifications rule)', 'Existing action_items (has lease_id, source_label, attachments)') },
  { id: 'runs', group: 'Assistant', label: 'Run history and audit source', duties: ['invoices'], source: M('Agent runs; audit source “agent”', 'Agents › Run history', 'Existing audit_log (add tables + source value)') },

  // Delivery
  { id: 'tenant_email', group: 'Delivery', label: 'Tenant email', duties: ['delivery'], source: E('tenants.email', 'Tenant profile') },
  { id: 'sending_mailbox', group: 'Delivery', label: 'Sending mailbox', duties: ['delivery'], source: M('Connected mailbox', 'Command center', 'Existing property_email_connections (schema only, no UI)') },
  { id: 'delivery_history', group: 'Delivery', label: 'Delivery history per issued PDF', duties: ['delivery'], source: M('Delivery event', 'Rent ops › invoice › Documents', 'New rows per document revision') },
]

// A per-tenant gap. `href` present = fixable today in an existing field;
// absent = needs a new field first.
export interface AssignmentGap {
  assignmentId: string
  requirementId: string
  message: string
  actionLabel: string | null
  destinationLabel: string
  href: string | null
}

export function assignmentGaps(a: TenantAssignment): AssignmentGap[] {
  const [property, unit = ''] = a.unitLabel.split(' — ')
  const gaps: AssignmentGap[] = []
  if (a.monthlyRent === null) {
    gaps.push({ assignmentId: a.id, requirementId: 'lease_rent', message: 'No rent amount on the active lease', actionLabel: 'Add rent on the lease', destinationLabel: `Properties › ${property} › Overview › Units › ${unit} › Lease`, href: `/properties/${a.propertyId}` })
  }
  if (a.issuerEntityId === null) {
    gaps.push({ assignmentId: a.id, requirementId: 'issuer_choice', message: `${a.ownerNote}. Needs the new “Invoice issuer” field; until then choose it on each invoice.`, actionLabel: 'Review owners', destinationLabel: `Properties › ${property} › Overview › Ownership`, href: `/properties/${a.propertyId}` })
  }
  if (a.billingEmail === null) {
    gaps.push({ assignmentId: a.id, requirementId: 'tenant_email', message: 'No email on the tenant profile (only needed once delivery exists)', actionLabel: 'Add email on tenant profile', destinationLabel: `Tenants › ${a.tenantName}`, href: `/tenants/${a.tenantId}` })
  }
  return gaps
}
