import { supabase } from '../../shared/supabaseClient'

// Read-only, one account and one loan. Never reconstruct balances from payments.
export async function listRecordedPrincipal(accountId: string, loanId: string) {
  return supabase.from('audit_log')
    .select('id, record_id, new_value, changed_at')
    .eq('account_id', accountId).eq('table_name', 'mortgage_details')
    .eq('record_id', loanId).eq('field_name', 'current_balance')
    .order('changed_at', { ascending: false }).limit(500)
}
