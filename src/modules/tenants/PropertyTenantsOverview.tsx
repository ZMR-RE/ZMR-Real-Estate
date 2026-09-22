import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listCurrentTenantsForProperty, type PropertyCurrentTenant } from './propertyTenantsQueries'

interface PropertyTenantsOverviewProps {
  propertyId: string
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Roadmap 7.10's Overview-tab Tenants box — a read-only, property-wide
// list of who's currently in place across every unit. Tenant assignment
// happens per-unit by design (a tenancy belongs to one unit's own lease),
// so rather than a dead end this box always links down to Units, where
// assigning, ending, or viewing history for a specific tenancy actually
// happens.
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
      Manage tenants in Units ↓
    </a>
  )
}

export function PropertyTenantsOverview({ propertyId }: PropertyTenantsOverviewProps) {
  const { accountId } = useAuth()
  const [tenants, setTenants] = useState<PropertyCurrentTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    listCurrentTenantsForProperty(accountId, propertyId).then(({ data, error: fetchError }) => {
      setLoading(false)
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      setError(null)
      setTenants(data ?? [])
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

  if (tenants.length === 0) {
    return (
      <>
        <p className="empty-state">No current tenants across any unit.</p>
        <ManageTenantsLink />
      </>
    )
  }

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Unit</th>
              <th>Tenant</th>
              <th>Since</th>
              <th>Rent</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((row) => (
              <tr key={row.id}>
                <td>{row.unit?.unit_label ?? '—'}</td>
                <td>{row.tenant?.name ?? '—'}</td>
                <td>{row.start_date}</td>
                <td>{row.rent_amount !== null ? currencyFormatter.format(Number(row.rent_amount)) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ManageTenantsLink />
    </>
  )
}
