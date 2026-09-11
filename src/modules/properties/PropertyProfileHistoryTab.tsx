import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { AuditLogList } from '../auditLog/AuditLogList'
import { useAuditLog } from '../auditLog/useAuditLog'
import type { Property } from './propertiesQueries'

interface PropertyProfileHistoryTabProps {
  property: Property
  llcOptions: SearchableSelectOption[]
}

// Roadmap 7.8 — basic audit trail. Property Profile is the one page that
// already surfaces the property's own fields, its LLC (via the Overview
// tab's picker), and its mortgage (via the Mortgage tab), so it's also
// the one place their combined history belongs.
export function PropertyProfileHistoryTab({ property, llcOptions }: PropertyProfileHistoryTabProps) {
  const { rows, loading, error } = useAuditLog(property.id, property.llc_id)

  if (loading) {
    return <p>Loading history…</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  return <AuditLogList rows={rows} llcOptions={llcOptions} />
}
