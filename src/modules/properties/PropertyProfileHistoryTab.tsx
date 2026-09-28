import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { AuditLogList } from '../auditLog/AuditLogList'
import { useAuditLog } from '../auditLog/useAuditLog'
import { resolveOwnershipAuthority } from '../llcs/ownershipInterestsQueries'
import { usePropertyOwnershipInterests } from './usePropertyOwnershipInterests'
import type { Property } from './propertiesQueries'

interface PropertyProfileHistoryTabProps {
  property: Property
  llcOptions: SearchableSelectOption[]
}

// Roadmap 7.8 — basic audit trail. Property Profile is the one page that
// already surfaces the property's own fields, its LLC (via the Overview
// tab's picker), and its mortgage (via the Mortgage tab), so it's also
// the one place their combined history belongs.
//
// Package 1 §2 — property.llc_id is a legacy pointer, not confirmed
// ownership, except when resolveOwnershipAuthority says so. Pulling an
// unconfirmed LLC's own audit history into this property's timeline
// would misleadingly imply a settled relationship, so this tab now
// only combines the two histories in the one case that's actually
// confirmed.
export function PropertyProfileHistoryTab({ property, llcOptions }: PropertyProfileHistoryTabProps) {
  const { interests, completeness } = usePropertyOwnershipInterests(property.id)
  const ownershipAuthority = resolveOwnershipAuthority(interests, completeness, property.llc_id)
  const authoritativeLlcId = ownershipAuthority.authoritative ? ownershipAuthority.llcId : null
  const { rows, loading, error } = useAuditLog(property.id, authoritativeLlcId)

  if (loading) {
    return <p>Loading history…</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  return <AuditLogList rows={rows} llcOptions={llcOptions} />
}
