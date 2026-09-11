import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getMortgageDetails } from '../mortgagePayoff/mortgagePayoffQueries'
import {
  listAccountMemberDirectory,
  listAuditLogEntries,
  type AuditedTable,
  type AuditLogEntry,
} from './auditLogQueries'
import { fieldLabel, formatChangedAt, formatFieldValue, RECORD_LABELS } from './auditLogFormatting'

export interface AuditLogRow {
  id: string
  changedAt: string
  record: string
  fieldName: string
  field: string
  // Raw stored values (uuid or null for llc_id, plain text otherwise) —
  // kept alongside the generically-formatted ones so the presentational
  // list can resolve llc_id to an LLC name using whatever llcOptions it
  // currently has, without that lookup being a data-fetch dependency here.
  rawOldValue: string | null
  rawNewValue: string | null
  formattedOldValue: string
  formattedNewValue: string
  who: string
}

// Combines the audit trail for a property and its linked LLC and mortgage
// records into one chronological list — Property Profile is the one page
// that already shows all three, so it's also the one place their history
// belongs (per CLAUDE.md's design principle: depth on one entity, not
// scattered screens).
export function useAuditLog(propertyId: string, llcId: string | null) {
  const { accountId } = useAuth()
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)

    const { data: mortgageDetails } = await getMortgageDetails(propertyId)
    const mortgageDetailsId = mortgageDetails?.id ?? null

    const fetches: Promise<{ data: AuditLogEntry[] | null; error: { message: string } | null }>[] = [
      listAuditLogEntries(accountId, 'properties', propertyId),
    ]
    if (llcId) fetches.push(listAuditLogEntries(accountId, 'llcs', llcId))
    if (mortgageDetailsId) fetches.push(listAuditLogEntries(accountId, 'mortgage_details', mortgageDetailsId))

    const [directoryRes, ...entryResults] = await Promise.all([
      listAccountMemberDirectory(accountId),
      ...fetches,
    ])
    setLoading(false)

    const fetchError = directoryRes.error?.message ?? entryResults.find((r) => r.error)?.error?.message
    if (fetchError) {
      setError(fetchError)
      return
    }

    setError(null)

    const emailByUserId = new Map((directoryRes.data ?? []).map((m) => [m.user_id, m.email]))
    const allEntries = entryResults.flatMap((r) => r.data ?? [])
    allEntries.sort((a, b) => (a.changed_at < b.changed_at ? 1 : -1))

    setRows(
      allEntries.map((entry) => ({
        id: entry.id,
        changedAt: formatChangedAt(entry.changed_at),
        record: RECORD_LABELS[entry.table_name as AuditedTable],
        fieldName: entry.field_name,
        field: fieldLabel(entry.field_name),
        rawOldValue: entry.old_value,
        rawNewValue: entry.new_value,
        formattedOldValue: formatFieldValue(entry.field_name, entry.old_value),
        formattedNewValue: formatFieldValue(entry.field_name, entry.new_value),
        who: (entry.changed_by && emailByUserId.get(entry.changed_by)) || 'A team member',
      })),
    )
  }, [accountId, propertyId, llcId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { rows, loading, error, refresh }
}
