import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getLastAuditChange } from '../auditLog/auditLogQueries'

interface PropertyLastUpdatedProps {
  propertyId: string
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

// Roadmap 7.35 (4) — small note sourced from the existing 7.8 audit
// trail (audit_log), not a separate updated_at column: properties
// already gets a row logged per changed field on every save, so the
// most recent one's timestamp is a real "last updated," not a new
// concept needing new schema. Self-fetching, same one-off-stat pattern
// as PropertyPricePerSqft — renders nothing while loading or if the
// record has never been edited (a brand-new property has no audit_log
// rows yet at all).
export function PropertyLastUpdated({ propertyId }: PropertyLastUpdatedProps) {
  const { accountId } = useAuth()
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    getLastAuditChange(accountId, 'properties', propertyId).then(({ data }) => {
      setLastUpdated(data?.changed_at ?? null)
    })
  }, [accountId, propertyId])

  if (!lastUpdated) return null

  return <p className="property-last-updated">Last updated {dateFormatter.format(new Date(lastUpdated))}</p>
}
