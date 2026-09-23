import { LeasingListingForm } from './LeasingListingForm'
import type { LeasingListing, LeasingListingInput } from './leasingListingsQueries'

interface LeasingListingListProps {
  listings: LeasingListing[]
  // Roadmap 7.28 — Box interaction standard: the box's default view
  // state shows plain read-only labels, no per-row Edit. Same pattern
  // as UtilityRecordList's readOnly prop.
  readOnly?: boolean
  editingId: string | null
  saving: boolean
  onStartEditing: (id: string) => void
  onSave: (id: string, input: LeasingListingInput) => void
  onCancel: () => void
}

// Whole days elapsed since date_posted — computed here rather than
// stored, so it's always current as of render, never goes stale.
function daysLive(datePosted: string): number {
  const posted = new Date(`${datePosted}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24))
}

export function LeasingListingList({
  listings,
  readOnly = false,
  editingId,
  saving,
  onStartEditing,
  onSave,
  onCancel,
}: LeasingListingListProps) {
  if (listings.length === 0) {
    return <p className="empty-state">No listings logged yet.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Platform</th>
            <th>Date posted</th>
            <th>Days live</th>
            <th>Notes</th>
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) =>
            !readOnly && editingId === listing.id ? (
              <tr key={listing.id}>
                <td colSpan={5}>
                  <LeasingListingForm
                    initialValues={{ platform: listing.platform, date_posted: listing.date_posted, notes: listing.notes }}
                    saving={saving}
                    onSave={(input) => onSave(listing.id, input)}
                    onCancel={onCancel}
                  />
                </td>
              </tr>
            ) : (
              <tr key={listing.id}>
                <td>{listing.platform}</td>
                <td>{listing.date_posted}</td>
                <td>{daysLive(listing.date_posted)}</td>
                <td>{listing.notes ?? ''}</td>
                {!readOnly && (
                  <td>
                    <button type="button" onClick={() => onStartEditing(listing.id)}>
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}
