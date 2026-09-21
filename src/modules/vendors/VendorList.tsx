import type { Vendor } from './vendorsQueries'

interface VendorListProps {
  vendors: Vendor[]
  onToggleArchived: (vendor: Vendor) => void
}

// Roadmap 1.17 — Settings' Vendor management view, list half. Mirrors
// OrganizationTypeList.tsx's table shape (name/status/actions columns,
// archived rows dimmed via the shared .row-voided class) without that
// component's edit form or "view properties" panel — this item's scope
// is list/add/archive/restore only.
export function VendorList({ vendors, onToggleArchived }: VendorListProps) {
  if (vendors.length === 0) {
    return <p className="empty-state">No vendors yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Contact email</th>
          <th>Contact phone</th>
          <th>W9</th>
          <th>Insurance</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {vendors.map((vendor) => (
          <tr key={vendor.id} className={vendor.archived ? 'row-voided' : ''}>
            <td>{vendor.name}</td>
            <td>{vendor.contact_email ?? '—'}</td>
            <td>{vendor.contact_phone ?? '—'}</td>
            <td>{vendor.has_w9 ? 'On file' : '—'}</td>
            <td>{vendor.has_insurance ? 'On file' : '—'}</td>
            <td>
              <span className={`status-badge ${vendor.archived ? 'status-badge-neutral' : 'status-badge-success'}`}>
                {vendor.archived ? 'Archived' : 'Active'}
              </span>
            </td>
            <td>
              <button type="button" onClick={() => onToggleArchived(vendor)}>
                {vendor.archived ? 'Restore' : 'Archive'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
