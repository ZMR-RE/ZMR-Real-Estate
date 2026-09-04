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
  vendor_source: string
  unit: string | null
  payment_method: string
  repair_or_improvement: RepairOrImprovement | null
  amount: number
  transaction_date: string
  description: string | null
  voided: boolean
  statement_reconciled: boolean
  property: { id: string; name: string } | null
}

export interface TransactionInput {
  propertyId: string
  entryType: EntryType
  category: Category
  subcategory: string | null
  vendorSource: string
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
      'id, entry_type, category, subcategory, vendor_source, unit, payment_method, repair_or_improvement, amount, transaction_date, description, voided, statement_reconciled, property:properties(id, name)',
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
      vendor_source: input.vendorSource,
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

export async function updateTransaction(id: string, input: TransactionInput) {
  return supabase
    .from('financial_transactions')
    .update({
      property_id: input.propertyId,
      entry_type: input.entryType,
      category: input.category,
      subcategory: input.subcategory,
      vendor_source: input.vendorSource,
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
