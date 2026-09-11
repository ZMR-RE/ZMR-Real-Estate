import { supabase } from '../../shared/supabaseClient'

export type AuditedTable = 'properties' | 'llcs' | 'mortgage_details'

export interface AuditLogEntry {
  id: string
  table_name: AuditedTable
  record_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: string | null
  changed_at: string
}

export async function listAuditLogEntries(accountId: string, tableName: AuditedTable, recordId: string) {
  return supabase
    .from('audit_log')
    .select('id, table_name, record_id, field_name, old_value, new_value, changed_by, changed_at')
    .eq('account_id', accountId)
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('changed_at', { ascending: false })
    .returns<AuditLogEntry[]>()
}

export interface AccountMemberDirectoryEntry {
  user_id: string
  email: string
}

// account_member_directory is a view (see migration 20260910271200_audit_trail.sql)
// that resolves auth.users ids to emails, scoped to people who share an
// account with the caller — the only client-safe way to read any part of
// auth.users.
export async function listAccountMemberDirectory(accountId: string) {
  return supabase
    .from('account_member_directory')
    .select('user_id, email')
    .eq('account_id', accountId)
    .returns<AccountMemberDirectoryEntry[]>()
}
