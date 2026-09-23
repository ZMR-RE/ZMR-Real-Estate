import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getLeaseStatus, listLeasesForTenant, type TenantLeaseHistoryEntry } from '../leases/leasesQueries'

interface TenantProfileLeaseHistoryProps {
  tenantId: string
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const STATUS_BADGE_VARIANTS = {
  upcoming: 'status-badge-accent',
  active: 'status-badge-success',
  ended: 'status-badge-neutral',
} as const

// Roadmap "Units/Lease/Tenant rebuild" item 5 — "auto-populated list of
// every lease (current + past, any property/unit)." Read-only (leases
// are still edited from their own unit's Lease history box, same single-
// source-of-truth principle as everywhere else in this app) — this is
// a rollup view across every property, not a second editing surface.
export function TenantProfileLeaseHistory({ tenantId }: TenantProfileLeaseHistoryProps) {
  const { accountId } = useAuth()
  const [leases, setLeases] = useState<TenantLeaseHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    listLeasesForTenant(accountId, tenantId).then(({ data, error: fetchError }) => {
      setLoading(false)
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      setError(null)
      setLeases(data ?? [])
    })
  }, [accountId, tenantId])

  if (loading) return <p>Loading…</p>
  if (error) return <p role="alert">{error}</p>
  if (leases.length === 0) {
    return <p className="empty-state">No leases on file yet.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Unit</th>
            <th>Start date</th>
            <th>End date</th>
            <th>Rent</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {leases.map((lease) => {
            const status = getLeaseStatus(lease)
            return (
              <tr key={lease.id} className={lease.archived ? 'row-voided' : ''}>
                <td>{lease.property_address}</td>
                <td>{lease.unit_label}</td>
                <td>{lease.start_date}</td>
                <td>{lease.end_date ?? 'Current'}</td>
                <td>{lease.rent_amount !== null ? currencyFormatter.format(Number(lease.rent_amount)) : '—'}</td>
                <td>
                  <span className={`status-badge ${STATUS_BADGE_VARIANTS[status]}`}>
                    {status === 'upcoming' ? 'Upcoming' : status === 'active' ? 'Active' : 'Ended'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
