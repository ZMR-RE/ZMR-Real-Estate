import type { TenantUnitAssignment } from './tenantsQueries'

interface TenantAssignmentListProps {
  assignments: TenantUnitAssignment[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function TenantAssignmentList({ assignments }: TenantAssignmentListProps) {
  if (assignments.length === 0) {
    return <p>No tenants assigned yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Tenant</th>
          <th>Start date</th>
          <th>End date</th>
          <th>Rent</th>
          <th>Late fee</th>
        </tr>
      </thead>
      <tbody>
        {assignments.map((assignment) => (
          <tr key={assignment.id}>
            <td>{assignment.tenant?.name ?? '—'}</td>
            <td>{assignment.start_date}</td>
            <td>{assignment.end_date ?? 'Current'}</td>
            <td>{assignment.rent_amount !== null ? currencyFormatter.format(Number(assignment.rent_amount)) : '—'}</td>
            <td>{assignment.late_fee !== null ? currencyFormatter.format(Number(assignment.late_fee)) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
