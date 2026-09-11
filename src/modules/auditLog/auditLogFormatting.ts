import type { AuditedTable } from './auditLogQueries'

export const RECORD_LABELS: Record<AuditedTable, string> = {
  properties: 'Property',
  llcs: 'LLC',
  mortgage_details: 'Mortgage',
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  llc_id: 'LLC',
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
}

const MONEY_FIELDS = new Set(['market_value', 'original_loan_amount', 'current_balance', 'monthly_payment', 'escrow_balance'])

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

  if (fieldName === 'interest_rate') {
    return `${rawValue}%`
  }

  return rawValue
}

export function formatChangedAt(changedAt: string): string {
  return new Date(changedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
