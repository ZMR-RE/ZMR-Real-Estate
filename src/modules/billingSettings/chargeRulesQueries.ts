import { supabase } from '../../shared/supabaseClient'

// Every Supabase call for tenancy billing rules (tenancy_charge_rules /
// tenancy_charge_statements, migration 20261002115000). The same rows are
// used by Tenancy & billing and by the assistant's Workload; invoice
// drafting reads them. Where a rule was billed is set only by the invoice
// actions — never here.

export type ChargeRuleKind = 'fixed_recurring' | 'variable_statement' | 'one_time'

export interface ChargeStatementRow {
  id: string
  service_period_start: string
  statement_amount: number
  document_id: string | null
  billed_invoice_id: string | null
}

export interface ChargeRuleRow {
  id: string
  lease_id: string
  kind: ChargeRuleKind
  description: string
  amount: number | null
  basis_total: number | null
  share_percent: number | null
  effective_from: string | null
  effective_to: string | null
  one_time_period: string | null
  applied_invoice_id: string | null
  status: 'active' | 'paused' | 'ended'
  notes: string | null
  version: number
  tenancy_charge_statements: ChargeStatementRow[]
}

export type ChargeRuleInput = Pick<ChargeRuleRow, 'kind' | 'description' | 'amount' | 'basis_total' | 'share_percent' | 'effective_from' | 'effective_to' | 'one_time_period' | 'notes'>

export async function listChargeRules(leaseId: string) {
  return supabase
    .from('tenancy_charge_rules')
    .select('id, lease_id, kind, description, amount, basis_total, share_percent, effective_from, effective_to, one_time_period, applied_invoice_id, status, notes, version, tenancy_charge_statements(id, service_period_start, statement_amount, document_id, billed_invoice_id)')
    .eq('lease_id', leaseId)
    .neq('status', 'ended')
    .order('created_at')
    .returns<ChargeRuleRow[]>()
}

export async function addChargeRule(accountId: string, leaseId: string, input: ChargeRuleInput) {
  return supabase.from('tenancy_charge_rules').insert({ account_id: accountId, lease_id: leaseId, ...input }).select('id').single()
}

// Version-checked: a rule changed elsewhere since it was read matches no row.
export async function updateChargeRule(id: string, expectedVersion: number, input: Partial<ChargeRuleInput> & { status?: ChargeRuleRow['status'] }) {
  return supabase.from('tenancy_charge_rules').update(input).eq('id', id).eq('version', expectedVersion).select('id').single()
}

export async function addChargeStatement(accountId: string, ruleId: string, servicePeriodStart: string, amount: number, documentId: string | null) {
  return supabase
    .from('tenancy_charge_statements')
    .insert({ account_id: accountId, rule_id: ruleId, service_period_start: servicePeriodStart, statement_amount: amount, document_id: documentId })
    .select('id')
    .single()
}

export async function rulesNeedingReview(leaseId: string) {
  const r = await supabase.rpc('charge_rules_needing_review', { p_lease_id: leaseId })
  return { data: (r.data ?? []) as { rule_id: string; reason: string }[], error: r.error }
}

export async function unresolvedVariableCharges(leaseId: string, periodStart: string) {
  const r = await supabase.rpc('unresolved_variable_charges', { p_lease_id: leaseId, p_period_start: periodStart })
  return { data: (r.data ?? []) as { rule_id: string; description: string; service_period_start: string }[], error: r.error }
}

export interface StatementDocumentOption {
  id: string
  label: string | null
  storage_path: string
  uploaded_at: string
}

// Existing documents on the tenancy's property, to link a statement to.
export async function listPropertyDocuments(propertyId: string) {
  return supabase
    .from('documents')
    .select('id, label, storage_path, uploaded_at')
    .eq('property_id', propertyId)
    .is('invoice_id', null)
    .order('uploaded_at', { ascending: false })
    .limit(100)
    .returns<StatementDocumentOption[]>()
}
