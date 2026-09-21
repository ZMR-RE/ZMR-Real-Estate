import { Fragment } from 'react'
import { VendorForm } from './VendorForm'
import type { Vendor, VendorInput } from './vendorsQueries'

interface VendorListProps {
  vendors: Vendor[]
  editingId: string | null
  saving: boolean
  error: string | null
  onStartEditing: (id: string) => void
  onSave: (id: string, input: VendorInput) => void
  onCancel: () => void
  onToggleArchived: (vendor: Vendor) => void
}

// Roadmap 1.17 — Settings' Vendor management view, list half. Mirrors
// OrganizationTypeList.tsx's table shape (name/status/actions columns,
// archived rows dimmed via the shared .row-voided class). Roadmap 1.28
// revision added Relationship/Notes to Vendor and, with them, editing
// (previously add/archive/restore only, same "no edit yet" scope
// Organization type itself started with before 8.2a) — this now mirrors
// OrganizationTypeList's inline edit-row swap too.
export function VendorList({
  vendors,
  editingId,
  saving,
  error,
  onStartEditing,
  onSave,
  onCancel,
  onToggleArchived,
}: VendorListProps) {
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
          <th>Relationship</th>
          <th>Notes</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {vendors.map((vendor) =>
          editingId === vendor.id ? (
            <tr key={vendor.id}>
              <td colSpan={9}>
                <VendorForm
                  initialValues={{
                    name: vendor.name,
                    contact_email: vendor.contact_email,
                    contact_phone: vendor.contact_phone,
                    has_w9: vendor.has_w9,
                    has_insurance: vendor.has_insurance,
                    relationship: vendor.relationship,
                    notes: vendor.notes,
                  }}
                  saving={saving}
                  error={error}
                  onSave={(input) => onSave(vendor.id, input)}
                  onCancel={onCancel}
                />
              </td>
            </tr>
          ) : (
            <Fragment key={vendor.id}>
              <tr className={vendor.archived ? 'row-voided' : ''}>
                <td>{vendor.name}</td>
                <td>{vendor.contact_email ?? '—'}</td>
                <td>{vendor.contact_phone ?? '—'}</td>
                <td>{vendor.has_w9 ? 'On file' : '—'}</td>
                <td>{vendor.has_insurance ? 'On file' : '—'}</td>
                <td>{vendor.relationship ?? '—'}</td>
                <td>{vendor.notes ?? '—'}</td>
                <td>
                  <span className={`status-badge ${vendor.archived ? 'status-badge-neutral' : 'status-badge-success'}`}>
                    {vendor.archived ? 'Archived' : 'Active'}
                  </span>
                </td>
                <td>
                  <button type="button" onClick={() => onStartEditing(vendor.id)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onToggleArchived(vendor)}>
                    {vendor.archived ? 'Restore' : 'Archive'}
                  </button>
                </td>
              </tr>
            </Fragment>
          ),
        )}
      </tbody>
    </table>
  )
}
