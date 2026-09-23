import { supabase } from '../../shared/supabaseClient'

export type DepositTransactionType = 'received' | 'returned' | 'applied_to_damages'

export const DEPOSIT_TRANSACTION_TYPE_LABELS: Record<DepositTransactionType, string> = {
  received: 'Deposit received',
  returned: 'Deposit returned',
  applied_to_damages: 'Applied to damages',
}

export interface ChartAccountRef {
  id: string
  name: string
  type: string
}

export interface DepositTransaction {
  id: string
  transaction_type: DepositTransactionType
  amount: number
  transaction_date: string
  description: string | null
  voided: boolean
  chart_account: ChartAccountRef | null
}

export interface SecurityDeposit {
  id: string
  unit: string | null
  tenant_name: string
  notes: string | null
  lease_id: string | null
  transactions: DepositTransaction[]
}

export interface SecurityDepositInput {
  unit: string | null
  tenantName: string
  notes: string | null
  // Units/Lease/Tenant rebuild — optional link back to the lease this
  // deposit belongs to (security_deposits.unit/tenant_name themselves
  // stay free text, unchanged; this is purely an added cross-reference).
  leaseId?: string | null
}

export interface DepositTransactionInput {
  securityDepositId: string
  transactionType: DepositTransactionType
  amount: number
  transactionDate: string
  description: string | null
}

// The one chart-of-accounts row deposits are allowed to post to. Looked
// up by system_key (not name) because Chart of Accounts names are
// user-editable — see 20260910240000_security_deposits.sql.
export async function getSecurityDepositsHeldAccount(accountId: string) {
  return supabase
    .from('chart_of_accounts')
    .select('id, name, type')
    .eq('account_id', accountId)
    .eq('system_key', 'security_deposits_held')
    .single()
    .returns<ChartAccountRef>()
}

const SECURITY_DEPOSIT_COLUMNS =
  'id, unit, tenant_name, notes, lease_id, transactions:security_deposit_transactions(id, transaction_type, amount, transaction_date, description, voided, chart_account:chart_of_accounts(id, name, type))'

export async function listSecurityDeposits(accountId: string, propertyId: string) {
  return supabase
    .from('security_deposits')
    .select(SECURITY_DEPOSIT_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .returns<SecurityDeposit[]>()
}

// Units/Lease/Tenant rebuild — "+ End lease" (UnitCard.tsx) looks this
// up to decide whether to link to an existing deposit's return workflow
// or offer to log a new one for this lease.
export async function getSecurityDepositForLease(accountId: string, leaseId: string) {
  return supabase
    .from('security_deposits')
    .select(SECURITY_DEPOSIT_COLUMNS)
    .eq('account_id', accountId)
    .eq('lease_id', leaseId)
    .maybeSingle()
    .returns<SecurityDeposit>()
}

export async function createSecurityDeposit(accountId: string, propertyId: string, input: SecurityDepositInput) {
  return supabase
    .from('security_deposits')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      unit: input.unit,
      tenant_name: input.tenantName,
      notes: input.notes,
      lease_id: input.leaseId ?? null,
    })
    .select()
    .single()
}

export async function createDepositTransaction(
  accountId: string,
  chartAccountId: string,
  recordedBy: string,
  input: DepositTransactionInput,
) {
  return supabase
    .from('security_deposit_transactions')
    .insert({
      account_id: accountId,
      security_deposit_id: input.securityDepositId,
      chart_account_id: chartAccountId,
      transaction_type: input.transactionType,
      amount: input.amount,
      transaction_date: input.transactionDate,
      description: input.description,
      recorded_by: recordedBy,
    })
    .select()
    .single()
}

export async function voidDepositTransaction(id: string) {
  return supabase
    .from('security_deposit_transactions')
    .update({ voided: true, voided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}
