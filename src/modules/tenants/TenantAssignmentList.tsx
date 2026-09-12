import type { TenantUnitAssignment } from './tenantsQueries'

interface TenantAssignmentListProps {
  assignments: TenantUnitAssignment[]
}

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
        </tr>
      </thead>
      <tbody>
        {assignments.map((assignment) => (
          <tr key={assignment.id}>
            <td>{assignment.tenant?.name ?? '—'}</td>
            <td>{assignment.start_date}</td>
            <td>{assignment.end_date ?? 'Current'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
