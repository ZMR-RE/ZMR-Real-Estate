import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listAccountMemberDirectory, listAuditLogEntries } from '../auditLog/auditLogQueries'
import { fieldLabel, formatChangedAt, formatFieldValue } from '../auditLog/auditLogFormatting'
import { CATEGORY_LABELS, type Category } from './financialsQueries'

export interface TransactionAuditRow {
  id: string
  changedAt: string
  fieldName: string
  field: string
  formattedOldValue: string
  formattedNewValue: string
  who: string
}

// category is a fixed enum with its own human-readable labels (Schedule E
// wording) — resolve it the same way the generic formatter handles money
// fields, rather than showing the raw stored value (e.g. "cleaning_and_maintenance").
function displayValue(fieldName: string, rawValue: string | null): string {
  if (fieldName === 'category' && rawValue !== null) {
    return CATEGORY_LABELS[rawValue as Category] ?? rawValue
  }
  return formatFieldValue(fieldName, rawValue)
}

// Roadmap 9.17 — extends the 7.8 audit trail to a single financial
// transaction. Reuses listAuditLogEntries/listAccountMemberDirectory
// as-is; simpler than useAuditLog since there's only one table/record to
// fetch here, not Property+LLC+Mortgage combined.
export function useTransactionAuditHistory(transactionId: string) {
  const { accountId } = useAuth()
  const [rows, setRows] = useState<TransactionAuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const [entriesRes, directoryRes] = await Promise.all([
      listAuditLogEntries(accountId, 'financial_transactions', transactionId),
      listAccountMemberDirectory(accountId),
    ])
    setLoading(false)

    const fetchError = entriesRes.error?.message ?? directoryRes.error?.message
    if (fetchError) {
      setError(fetchError)
      return
    }
    setError(null)

    const emailByUserId = new Map((directoryRes.data ?? []).map((m) => [m.user_id, m.email]))

    setRows(
      (entriesRes.data ?? []).map((entry) => ({
        id: entry.id,
        changedAt: formatChangedAt(entry.changed_at),
        fieldName: entry.field_name,
        field: fieldLabel(entry.field_name),
        formattedOldValue: displayValue(entry.field_name, entry.old_value),
        formattedNewValue: displayValue(entry.field_name, entry.new_value),
        who: (entry.changed_by && emailByUserId.get(entry.changed_by)) || 'A team member',
      })),
    )
  }, [accountId, transactionId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { rows, loading, error }
}
