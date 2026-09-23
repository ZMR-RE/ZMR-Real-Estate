import type { TenantUnitAssignment } from './tenantsQueries'

interface TenantAssignmentListProps {
  assignments: TenantUnitAssignment[]
  // Roadmap 7.28 — Box interaction standard: the box's default view
  // state shows plain read-only rows, no Archive/Restore action.
  readOnly?: boolean
  onToggleArchived: (assignment: TenantUnitAssignment) => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

// Roadmap 8.12 — Status/Actions columns added, same Archive/Restore
// pattern as FinancialAccountList/VendorList (archived rows stay
// visible, dimmed via the shared .row-voided class, never hard-deleted).
export function TenantAssignmentList({ assignments, readOnly = false, onToggleArchived }: TenantAssignmentListProps) {
  if (assignments.length === 0) {
    return <p className="empty-state">No tenants assigned yet — add the first one whenever they move in.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Start date</th>
            <th>End date</th>
            <th>Rent</th>
            <th>Late fee</th>
            <th>Status</th>
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => (
            <tr key={assignment.id} className={assignment.archived ? 'row-voided' : ''}>
              <td>{assignment.tenant?.name ?? '—'}</td>
              <td>{assignment.start_date}</td>
              <td>{assignment.end_date ?? 'Current'}</td>
              <td>{assignment.rent_amount !== null ? currencyFormatter.format(Number(assignment.rent_amount)) : '—'}</td>
              <td>{assignment.late_fee !== null ? currencyFormatter.format(Number(assignment.late_fee)) : '—'}</td>
              <td>
                <span className={`status-badge ${assignment.archived ? 'status-badge-neutral' : 'status-badge-success'}`}>
                  {assignment.archived ? 'Archived' : 'Active'}
                </span>
              </td>
              {!readOnly && (
                <td>
                  <button type="button" onClick={() => onToggleArchived(assignment)}>
                    {assignment.archived ? 'Restore' : 'Archive'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
