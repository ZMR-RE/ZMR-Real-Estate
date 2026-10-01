import type { AuditedTable } from './auditLogQueries'

export const RECORD_LABELS: Record<AuditedTable, string> = {
  properties: 'Property',
  llcs: 'Organization type',
  mortgage_details: 'Mortgage',
  financial_transactions: 'Transaction',
  mortgage_payments: 'Mortgage payment',
  mortgage_escrow_transactions: 'Escrow entry',
}

// Internal counters and timestamps recorded by the balance-integrity rules: kept in the audit trail, not shown as
// user-facing field changes.
export const HIDDEN_AUDIT_FIELDS = new Set([
  'principal_version',
  'escrow_version',
  'principal_epoch',
  'escrow_epoch',
  'principal_figure_at',
  'escrow_figure_at',
  'mortgage_id',
])

const VOID_OUTCOME_LABELS: Record<string, string> = {
  reversed: 'Balance reversed',
  skipped_reset_after_entry: 'Balance not changed (it had been updated after this entry)',
  skipped_loan_inactive: 'Balance not changed (inactive mortgage record)',
  skipped_unlinked_legacy: 'Balance not changed (earlier entry not linked to a loan)',
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  llc_id: 'Organization type',
  address: 'Address',
  city: 'City',
  state: 'State',
  zip: 'Zip',
  insurance_provider: 'Insurance provider',
  insurance_policy_number: 'Insurance policy number',
  contact_email: 'Contact email',
  market_value: 'Market value',
  status: 'Status',
  ein: 'EIN',
  formation_state: 'Formation state',
  registered_agent: 'Registered agent',
  annual_report_due_date: 'Annual report due date',
  lender_name: 'Lender',
  original_loan_amount: 'Original loan amount',
  current_balance: 'Current balance',
  interest_rate: 'Interest rate',
  monthly_payment: 'Monthly payment',
  loan_start_date: 'Loan start date',
  term_years: 'Term (years)',
  escrow_balance: 'Escrow balance',
  category: 'Category',
  subcategory: 'Subcategory',
  vendor_id: 'Vendor',
  unit: 'Unit',
  payment_method: 'Payment method',
  repair_or_improvement: 'Repair or improvement',
  amount: 'Amount',
  transaction_date: 'Date',
  description: 'Description',
  voided: 'Voided',
  voided_at: 'Voided at',
  statement_reconciled: 'Matched to bank/credit-card statement',
  entry_type: 'Type',
  loan_number: 'Loan number',
  loan_type: 'Loan type',
  payment_date: 'Payment date',
  principal_amount: 'Principal',
  interest_amount: 'Interest',
  transaction_type: 'Escrow type',
  void_reason: 'Void reason',
  void_outcome: 'Void result',
  principal_as_of: 'Principal statement date',
  escrow_as_of: 'Escrow statement date',
}

const MONEY_FIELDS = new Set([
  'market_value',
  'original_loan_amount',
  'current_balance',
  'monthly_payment',
  'escrow_balance',
  'amount',
  'principal_amount',
  'interest_amount',
])

export function fieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName
}

// llc_id is handled by the caller (needs the LLC name lookup, not just the
// raw uuid) — everything else is generic formatting from the stored text.
export function formatFieldValue(fieldName: string, rawValue: string | null): string {
  if (rawValue === null) {
    return '(empty)'
  }

  if (MONEY_FIELDS.has(fieldName)) {
    const parsed = Number(rawValue)
    return Number.isNaN(parsed) ? rawValue : `$${parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (fieldName === 'void_outcome') {
    return VOID_OUTCOME_LABELS[rawValue] ?? rawValue
  }

  if (fieldName === 'interest_rate') {
    return `${rawValue}%`
  }

  return rawValue
}

export function formatChangedAt(changedAt: string): string {
  return new Date(changedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
