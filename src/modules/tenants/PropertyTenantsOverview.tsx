import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { listAllTenantsEverAtProperty, type LeaseStatus, type PropertyTenantRow } from '../leases/leasesQueries'

interface PropertyTenantsOverviewProps {
  propertyId: string
}

// Roadmap "Units/Lease/Tenant rebuild" item 3 — a full directory of
// every tenant ever at this property (current highlighted, past shown
// secondary), each row linking to that tenant's own profile page
// (Stage 7's /tenants/:id). Tenant assignment itself still happens
// per-unit (a tenancy belongs to one unit's own lease), so this box
// always links down to Units for that, same as before.
// Same status rule and badge colours as Units › Lease history; this box
// keeps its "Current"/"Past" wording for active and ended tenancies.
const STATUS_BADGE: Record<LeaseStatus, { label: string; variant: string }> = {
  active: { label: 'Current', variant: 'status-badge-success' },
  upcoming: { label: 'Upcoming', variant: 'status-badge-accent' },
  ended: { label: 'Past', variant: 'status-badge-neutral' },
}

function ManageTenantsLink() {
  return (
    <a
      href="#units-section"
      className="manage-tenants-link"
      onClick={() => {
        const target = document.getElementById('units-section')
        if (target instanceof HTMLDetailsElement) target.open = true
      }}
    >
      Units and lease history ↓
    </a>
  )
}

export function PropertyTenantsOverview({ propertyId }: PropertyTenantsOverviewProps) {
  const { accountId } = useAuth()
  const [rows, setRows] = useState<PropertyTenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    listAllTenantsEverAtProperty(accountId, propertyId).then(({ data, error: fetchError }) => {
      setLoading(false)
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      setError(null)
      setRows(data ?? [])
    })
  }, [accountId, propertyId])

  if (loading) {
    return <p>Loading…</p>
  }

  if (error) {
    return (
      <>
        <p role="alert">{error}</p>
        <ManageTenantsLink />
      </>
    )
  }

  if (rows.length === 0) {
    return (
      <>
        <p className="empty-state">No tenants yet — use + Add tenant above, or + Add lease on a unit in Units.</p>
        <ManageTenantsLink />
      </>
    )
  }

  // Current, then upcoming, then past — each tier keeps its own
  // tenant-name order (listAllTenantsEverAtProperty already sorts by
  // lease start_date desc, which reads naturally within each tier).
  const current = rows.filter((row) => row.status === 'active')
  const upcoming = rows.filter((row) => row.status === 'upcoming')
  const past = rows.filter((row) => row.status === 'ended')

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Unit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...current, ...upcoming, ...past].map((row) => (
              <tr key={`${row.leaseId}:${row.tenant.id}`} className={row.status === 'ended' ? 'property-tenant-row-past' : ''}>
                <td>
                  <Link to={`/tenants/${row.tenant.id}`}>{row.tenant.name}</Link>
                </td>
                <td>{row.unitLabel}</td>
                <td>
                  <span className={`status-badge ${STATUS_BADGE[row.status].variant}`}>{STATUS_BADGE[row.status].label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ManageTenantsLink />
    </>
  )
}
