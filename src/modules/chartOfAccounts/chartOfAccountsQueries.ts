import { supabase } from '../../shared/supabaseClient'
import type { Category } from '../financials/financialsQueries'

export type AccountType = 'asset' | 'liability' | 'income' | 'expense'

export const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'income', 'expense']

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Asset',
  liability: 'Liability',
  income: 'Income',
  expense: 'Expense',
}

export interface ChartAccount {
  id: string
  type: AccountType
  name: string
  description: string | null
}

export interface ChartAccountInput {
  type: AccountType
  name: string
  description: string | null
}

export interface CategoryMapping {
  id: string
  category: Category
  chart_account_id: string
}

export async function listChartOfAccounts(accountId: string) {
  return supabase
    .from('chart_of_accounts')
    .select('id, type, name, description')
    .eq('account_id', accountId)
    .order('type', { ascending: true })
    .order('name', { ascending: true })
    .returns<ChartAccount[]>()
}

export async function createChartAccount(accountId: string, input: ChartAccountInput) {
  return supabase
    .from('chart_of_accounts')
    .insert({
      account_id: accountId,
      type: input.type,
      name: input.name,
      description: input.description,
    })
    .select()
    .single()
}

export async function updateChartAccount(id: string, input: ChartAccountInput) {
  return supabase
    .from('chart_of_accounts')
    .update({
      type: input.type,
      name: input.name,
      description: input.description,
    })
    .eq('id', id)
    .select()
    .single()
}

export async function listCategoryMappings(accountId: string) {
  return supabase
    .from('category_account_mappings')
    .select('id, category, chart_account_id')
    .eq('account_id', accountId)
    .returns<CategoryMapping[]>()
}

export async function updateCategoryMapping(id: string, chartAccountId: string) {
  return supabase
    .from('category_account_mappings')
    .update({ chart_account_id: chartAccountId })
    .eq('id', id)
    .select()
    .single()
}
