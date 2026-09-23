import { supabase } from '../../shared/supabaseClient'

export type EntryType = 'income' | 'expense'

export type IncomeCategory = 'rents_received' | 'other_income'

export type ExpenseCategory =
  | 'advertising'
  | 'auto_and_travel'
  | 'cleaning_and_maintenance'
  | 'commissions'
  | 'insurance'
  | 'legal_and_professional_fees'
  | 'management_fees'
  | 'mortgage_interest'
  | 'other_interest'
  | 'repairs'
  | 'supplies'
  | 'taxes'
  | 'utilities'
  | 'depreciation'
  | 'other_expense'

export type Category = IncomeCategory | ExpenseCategory

export type RepairOrImprovement = 'repair' | 'improvement'

export const INCOME_CATEGORIES: IncomeCategory[] = ['rents_received', 'other_income']

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'advertising',
  'auto_and_travel',
  'cleaning_and_maintenance',
  'commissions',
  'insurance',
  'legal_and_professional_fees',
  'management_fees',
  'mortgage_interest',
  'other_interest',
  'repairs',
  'supplies',
  'taxes',
  'utilities',
  'depreciation',
  'other_expense',
]

// Labels follow Schedule E (Form 1040) line-item naming so the export
// reads the same way a tax preparer expects to see it.
export const CATEGORY_LABELS: Record<Category, string> = {
  rents_received: 'Rents received',
  other_income: 'Other income',
  advertising: 'Advertising',
  auto_and_travel: 'Auto and travel',
  cleaning_and_maintenance: 'Cleaning and maintenance',
  commissions: 'Commissions',
  insurance: 'Insurance',
  legal_and_professional_fees: 'Legal and other professional fees',
  management_fees: 'Management fees',
  mortgage_interest: 'Mortgage interest paid to banks',
  other_interest: 'Other interest',
  repairs: 'Repairs',
  supplies: 'Supplies',
  taxes: 'Taxes',
  utilities: 'Utilities',
  depreciation: 'Depreciation expense',
  other_expense: 'Other expenses',
}

export interface Transaction {
  id: string
  entry_type: EntryType
  category: Category
  subcategory: string | null
  vendor: { id: string; name: string; split_percentage: number | null; split_description: string | null } | null
  // Roadmap 9.9 — a bridged transaction's payer may be a tenant or
  // prospective tenant instead of a vendor (matching capture_log's own
  // three-way "paid to" design); at most one of vendor/tenant/
  // prospective_tenant is ever set. Always null for a manually-entered
  // transaction, which still requires a vendor via TransactionForm.
  tenant: { id: string; name: string } | null
  prospective_tenant: { id: string; name: string } | null
  unit: string | null
  payment_method: string
  repair_or_improvement: RepairOrImprovement | null
  amount: number
  transaction_date: string
  description: string | null
  voided: boolean
  statement_reconciled: boolean
  property: { id: string; name: string; address: string | null } | null
  reimbursement_source_id: string | null
}

export interface TransactionInput {
  propertyId: string
  entryType: EntryType
  category: Category
  subcategory: string | null
  vendorId: string
  unit: string | null
  paymentMethod: string
  repairOrImprovement: RepairOrImprovement | null
  amount: number
  transactionDate: string
  description: string | null
  statementReconciled: boolean
}

export interface TransactionFilters {
  propertyId?: string | null
  year?: number | null
}

export async function listTransactions(accountId: string, filters: TransactionFilters = {}) {
  let query = supabase
    .from('financial_transactions')
    .select(
      'id, entry_type, category, subcategory, vendor:vendors(id, name, split_percentage, split_description), tenant:tenants(id, name), prospective_tenant:prospective_tenants(id, name), unit, payment_method, repair_or_improvement, amount, transaction_date, description, voided, statement_reconciled, property:properties(id, name, address), reimbursement_source_id',
    )
    .eq('account_id', accountId)
    .eq('voided', false)
    .order('transaction_date', { ascending: false })

  if (filters.propertyId) {
    query = query.eq('property_id', filters.propertyId)
  }

  if (filters.year) {
    query = query.gte('transaction_date', `${filters.year}-01-01`).lte('transaction_date', `${filters.year}-12-31`)
  }

  return query.returns<Transaction[]>()
}

export async function createTransaction(accountId: string, recordedBy: string, input: TransactionInput) {
  return supabase
    .from('financial_transactions')
    .insert({
      account_id: accountId,
      property_id: input.propertyId,
      entry_type: input.entryType,
      category: input.category,
      subcategory: input.subcategory,
      vendor_id: input.vendorId,
      unit: input.unit,
      payment_method: input.paymentMethod,
      repair_or_improvement: input.repairOrImprovement,
      amount: input.amount,
      transaction_date: input.transactionDate,
      description: input.description,
      statement_reconciled: input.statementReconciled,
      recorded_by: recordedBy,
    })
    .select()
    .single()
}

// Roadmap 2.4a — Historical Data Backfill's bulk CSV import. Separate
// from TransactionInput/createTransaction because a backfilled row's
// vendor is optional (unlike TransactionForm's manual entry, which
// still requires one) — mirrors 9.9's bridge reasoning for the same
// nullable-vendor_id column. A single multi-row insert (one SQL
// statement, all rows in one array) rather than a loop of single
// inserts, so an import is all-or-nothing: if any row fails validation
// server-side, nothing from this batch is written, matching the "review
// before anything saves" requirement — the useHistoricalImport hook
// itself is the thing responsible for not calling this until every row
// has already been reviewed/resolved client-side.
export interface BulkTransactionInput {
  propertyId: string
  entryType: EntryType
  category: Category
  subcategory: string | null
  vendorId: string | null
  unit: string | null
  paymentMethod: string
  repairOrImprovement: RepairOrImprovement | null
  amount: number
  transactionDate: string
  description: string | null
}

export async function bulkCreateTransactions(
  accountId: string,
  recordedBy: string,
  inputs: BulkTransactionInput[],
) {
  return supabase
    .from('financial_transactions')
    .insert(
      inputs.map((input) => ({
        account_id: accountId,
        property_id: input.propertyId,
        entry_type: input.entryType,
        category: input.category,
        subcategory: input.subcategory,
        vendor_id: input.vendorId,
        unit: input.unit,
        payment_method: input.paymentMethod,
        repair_or_improvement: input.repairOrImprovement,
        amount: input.amount,
        transaction_date: input.transactionDate,
        description: input.description,
        statement_reconciled: false,
        recorded_by: recordedBy,
      })),
    )
    .select('id')
}

// Roadmap 9.9 — the Quick Capture → Financials bridge's own insert path,
// deliberately separate from TransactionInput/createTransaction rather
// than reusing them: a bridged transaction's payer is tri-state (vendor
// OR tenant OR prospective tenant OR none), never enforced-required the
// way TransactionForm's manual entry still is, and amount can be
// negative (Refund-Return, netting against the same expense category —
// see 20260922030000). Exactly one of vendorId/tenantId/
// prospectiveTenantId may be set, matching
// financial_transactions_payer_single_entity; leave all three null/
// undefined for a receipt with no payer selected.
export interface TransactionFromCaptureInput {
  propertyId: string
  entryType: EntryType
  category: Category
  subcategory: string | null
  vendorId: string | null
  tenantId: string | null
  prospectiveTenantId: string | null
  unit: string | null
  paymentMethod: string
  repairOrImprovement: RepairOrImprovement | null
  amount: number
  transactionDate: string
  description: string | null
}

export async function createTransactionFromCapture(
  accountId: string,
  recordedBy: string,
  input: TransactionFromCaptureInput,
) {
  return supabase
    .from('financial_transactions')
    .insert({
      account_id: accountId,
      property_id: input.propertyId,
      entry_type: input.entryType,
      category: input.category,
      subcategory: input.subcategory,
      vendor_id: input.vendorId,
      tenant_id: input.tenantId,
      prospective_tenant_id: input.prospectiveTenantId,
      unit: input.unit,
      payment_method: input.paymentMethod,
      repair_or_improvement: input.repairOrImprovement,
      amount: input.amount,
      transaction_date: input.transactionDate,
      description: input.description,
      statement_reconciled: false,
      recorded_by: recordedBy,
    })
    .select('id')
    .single<{ id: string }>()
}

export interface ReimbursementTransactionInput {
  propertyId: string
  vendorId: string
  unit: string | null
  paymentMethod: string
  amount: number
  transactionDate: string
  description: string | null
  reimbursementSourceId: string
}

// The only thing "Apply saved split" (roadmap 8.8) ever inserts — always
// income/other_income, always linked back to the original expense via
// reimbursement_source_id, never touches the original row. Kept separate
// from createTransaction/TransactionInput so the regular transaction form
// has no way to set reimbursement_source_id itself; only the explicit
// one-click apply action (useFinancials.applySplit) calls this.
export async function createReimbursementTransaction(
  accountId: string,
  recordedBy: string,
  input: ReimbursementTransactionInput,
) {
  return supabase
    .from('financial_transactions')
    .insert({
      account_id: accountId,
      property_id: input.propertyId,
      entry_type: 'income',
      category: 'other_income',
      subcategory: null,
      vendor_id: input.vendorId,
      unit: input.unit,
      payment_method: input.paymentMethod,
      repair_or_improvement: null,
      amount: input.amount,
      transaction_date: input.transactionDate,
      description: input.description,
      statement_reconciled: false,
      recorded_by: recordedBy,
      reimbursement_source_id: input.reimbursementSourceId,
    })
    .select()
    .single()
}

export async function updateTransaction(id: string, input: TransactionInput) {
  return supabase
    .from('financial_transactions')
    .update({
      property_id: input.propertyId,
      entry_type: input.entryType,
      category: input.category,
      subcategory: input.subcategory,
      vendor_id: input.vendorId,
      unit: input.unit,
      payment_method: input.paymentMethod,
      repair_or_improvement: input.repairOrImprovement,
      amount: input.amount,
      transaction_date: input.transactionDate,
      description: input.description,
      statement_reconciled: input.statementReconciled,
    })
    .eq('id', id)
    .select()
    .single()
}

export async function voidTransaction(id: string) {
  return supabase
    .from('financial_transactions')
    .update({ voided: true, voided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}
