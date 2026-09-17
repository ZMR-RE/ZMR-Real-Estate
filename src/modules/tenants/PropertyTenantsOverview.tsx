import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listCurrentTenantsForProperty, type PropertyCurrentTenant } from './propertyTenantsQueries'

interface PropertyTenantsOverviewProps {
  propertyId: string
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Roadmap 7.10's Overview-tab Tenants box — a read-only, property-wide
// list of who's currently in place across every unit. To assign, end, or
// see history for a specific tenancy, use that unit's own Tenants box in
// the Units section below.
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
    return <p role="alert">{error}</p>
  }

  if (tenants.length === 0) {
    return <p className="empty-state">No current tenants across any unit.</p>
  }

  return (
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
  )
}
