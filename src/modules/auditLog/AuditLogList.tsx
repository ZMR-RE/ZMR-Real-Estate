import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { NO_LLC_ID } from '../llcs/useLlcs'
import type { AuditLogRow } from './useAuditLog'

interface AuditLogListProps {
  rows: AuditLogRow[]
  llcOptions: SearchableSelectOption[]
}

function resolveLlcDisplay(rawValue: string | null, llcOptions: SearchableSelectOption[]): string {
  if (rawValue === null) {
    return llcOptions.find((o) => o.id === NO_LLC_ID)?.label ?? 'No LLC'
  }
  return llcOptions.find((o) => o.id === rawValue)?.label ?? rawValue
}

function displayValue(row: AuditLogRow, raw: string | null, formatted: string, llcOptions: SearchableSelectOption[]): string {
  return row.fieldName === 'llc_id' ? resolveLlcDisplay(raw, llcOptions) : formatted
}

// Plain-language audit trail for roadmap 7.8 — combines Property, LLC,
// and Mortgage field changes for this property into one chronological
// list, e.g. "jane@example.com changed LLC from 'Individually owned' to
// '5336 W Foster LLC' on Sep 10, 2026".
export function AuditLogList({ rows, llcOptions }: AuditLogListProps) {
  if (rows.length === 0) {
    return <p className="empty-state">No changes logged yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Record</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.changedAt}</td>
            <td>{row.record}</td>
            <td>
              {row.who} changed {row.field} from &lsquo;{displayValue(row, row.rawOldValue, row.formattedOldValue, llcOptions)}&rsquo; to &lsquo;
              {displayValue(row, row.rawNewValue, row.formattedNewValue, llcOptions)}&rsquo;
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
