import { useState } from 'react'
import { getLeaseStatus, type Lease, type LeaseInput } from './leasesQueries'

interface LeaseListProps {
  leases: Lease[]
  // Roadmap 7.28 — Box interaction standard: the box's default view
  // state shows plain read-only rows, no Edit/Archive/End actions.
  readOnly?: boolean
  editingId?: string | null
  endingId?: string | null
  saving?: boolean
  onStartEditing?: (id: string) => void
  onSave?: (id: string, input: Pick<LeaseInput, 'startDate' | 'endDate' | 'rentAmount' | 'lateFee' | 'moveInFee'>) => void
  onCancelEdit?: () => void
  onStartEnding?: (id: string) => void
  onEndLease?: (id: string, endDate: string, endReason: string | null) => void
  onCancelEnd?: () => void
  onToggleArchived?: (lease: Lease) => void
  todayDateString?: string
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function formatMoney(value: string | null): string {
  return value !== null ? currencyFormatter.format(Number(value)) : '—'
}

const STATUS_BADGE_VARIANTS = {
  upcoming: 'status-badge-accent',
  active: 'status-badge-success',
  ended: 'status-badge-neutral',
} as const

// "+ End lease" inline form (roadmap item 2) — just end date + reason;
// tenants/rent/dates-so-far are already set, ending is a distinct,
// smaller action from editing those.
function EndLeaseForm({
  saving,
  todayDateString,
  onSave,
  onCancel,
}: {
  saving: boolean
  todayDateString: string
  onSave: (endDate: string, endReason: string | null) => void
  onCancel: () => void
}) {
  const [endDate, setEndDate] = useState(todayDateString)
  const [endReason, setEndReason] = useState('')

  return (
    <div className="inline-form">
      <label htmlFor="end_lease_date">
        End date<span className="required-marker">*</span>
      </label>
      <input id="end_lease_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />

      <label htmlFor="end_lease_reason">Why did it end?</label>
      <input
        id="end_lease_reason"
        placeholder="e.g. Lease term completed, not renewed"
        value={endReason}
        onChange={(e) => setEndReason(e.target.value)}
      />

      <button type="button" disabled={saving || !endDate} onClick={() => onSave(endDate, endReason || null)}>
        {saving ? 'Ending…' : 'End lease'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}

// Compact edit form for an existing lease's own fields — tenant
// membership isn't editable after creation (see leasesQueries.ts's
// updateLease comment); a wrong tenant is corrected by archiving the
// lease and creating a new one, same "archive and redo" pattern used
// everywhere else in this app for a mistaken entry.
function LeaseEditForm({
  lease,
  saving,
  onSave,
  onCancel,
}: {
  lease: Lease
  saving: boolean
  onSave: (input: Pick<LeaseInput, 'startDate' | 'endDate' | 'rentAmount' | 'lateFee' | 'moveInFee'>) => void
  onCancel: () => void
}) {
  const [startDate, setStartDate] = useState(lease.start_date)
  const [endDate, setEndDate] = useState(lease.end_date ?? '')
  const [rentAmount, setRentAmount] = useState(lease.rent_amount ?? '')
  const [lateFee, setLateFee] = useState(lease.late_fee ?? '')
  const [moveInFee, setMoveInFee] = useState(lease.move_in_fee ?? '')

  return (
    <div className="inline-form">
      <label htmlFor={`lease_edit_start_${lease.id}`}>
        Start date<span className="required-marker">*</span>
      </label>
      <input
        id={`lease_edit_start_${lease.id}`}
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        required
      />

      <label htmlFor={`lease_edit_end_${lease.id}`}>End date (leave blank if current)</label>
      <input id={`lease_edit_end_${lease.id}`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

      <label htmlFor={`lease_edit_rent_${lease.id}`}>Rent amount ($)</label>
      <input
        id={`lease_edit_rent_${lease.id}`}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={rentAmount}
        onChange={(e) => setRentAmount(e.target.value)}
      />

      <label htmlFor={`lease_edit_late_fee_${lease.id}`}>Late fee ($)</label>
      <input
        id={`lease_edit_late_fee_${lease.id}`}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={lateFee}
        onChange={(e) => setLateFee(e.target.value)}
      />

      <label htmlFor={`lease_edit_move_in_fee_${lease.id}`}>Move-in fee ($)</label>
      <input
        id={`lease_edit_move_in_fee_${lease.id}`}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={moveInFee}
        onChange={(e) => setMoveInFee(e.target.value)}
      />

      <button
        type="button"
        disabled={saving || !startDate}
        onClick={() =>
          onSave({
            startDate,
            endDate: endDate || null,
            rentAmount: rentAmount || null,
            lateFee: lateFee || null,
            moveInFee: moveInFee || null,
          })
        }
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}

export function LeaseList({
  leases,
  readOnly = false,
  editingId,
  endingId,
  saving = false,
  onStartEditing,
  onSave,
  onCancelEdit,
  onStartEnding,
  onEndLease,
  onCancelEnd,
  onToggleArchived,
  todayDateString,
}: LeaseListProps) {
  if (leases.length === 0) {
    return <p className="empty-state">No leases logged yet — add the first one whenever a tenant moves in.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Tenant(s)</th>
            <th>Start date</th>
            <th>End date</th>
            <th>Rent</th>
            <th>Late fee</th>
            <th>Move-in fee</th>
            <th>Status</th>
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {leases.map((lease) => {
            if (!readOnly && editingId === lease.id) {
              return (
                <tr key={lease.id}>
                  <td colSpan={8}>
                    <LeaseEditForm lease={lease} saving={saving} onSave={(input) => onSave?.(lease.id, input)} onCancel={() => onCancelEdit?.()} />
                  </td>
                </tr>
              )
            }
            if (!readOnly && endingId === lease.id) {
              return (
                <tr key={lease.id}>
                  <td colSpan={8}>
                    <EndLeaseForm
                      saving={saving}
                      todayDateString={todayDateString ?? new Date().toISOString().slice(0, 10)}
                      onSave={(endDate, endReason) => onEndLease?.(lease.id, endDate, endReason)}
                      onCancel={() => onCancelEnd?.()}
                    />
                  </td>
                </tr>
              )
            }

            const status = getLeaseStatus(lease)
            return (
              <tr key={lease.id} className={lease.archived ? 'row-voided' : ''}>
                <td>{lease.tenants.map((t) => t.name).join(', ') || '—'}</td>
                <td>{lease.start_date}</td>
                <td>{lease.end_date ?? 'Current'}</td>
                <td>{formatMoney(lease.rent_amount)}</td>
                <td>{formatMoney(lease.late_fee)}</td>
                <td>{formatMoney(lease.move_in_fee)}</td>
                <td>
                  <span className={`status-badge ${STATUS_BADGE_VARIANTS[status]}`}>
                    {status === 'upcoming' ? 'Upcoming' : status === 'active' ? 'Active' : 'Ended'}
                  </span>
                  {lease.end_reason && <p className="lease-end-reason">Why: {lease.end_reason}</p>}
                </td>
                {!readOnly && (
                  <td>
                    <button type="button" onClick={() => onStartEditing?.(lease.id)}>
                      Edit
                    </button>
                    {status !== 'ended' && (
                      <button type="button" onClick={() => onStartEnding?.(lease.id)}>
                        End lease
                      </button>
                    )}
                    <button type="button" onClick={() => onToggleArchived?.(lease)}>
                      {lease.archived ? 'Restore' : 'Archive'}
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
