import type { OccupancySnapshot } from './useOccupancySnapshot'

interface OccupancySnapshotCardProps {
  loading: boolean
  error: string | null
  snapshot: OccupancySnapshot
}

const percentFormatter = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 })

export function OccupancySnapshotCard({ loading, error, snapshot }: OccupancySnapshotCardProps) {
  if (loading) {
    return <p>Loading…</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  if (snapshot.totalUnits === 0) {
    return <p className="empty-state">No units logged yet — add units in the Overview tab to see occupancy.</p>
  }

  return (
    <dl>
      <dt>Occupancy rate</dt>
      <dd>
        {snapshot.occupancyRate !== null ? percentFormatter.format(snapshot.occupancyRate) : '—'} (
        {snapshot.rentedUnits} of {snapshot.totalUnits} units rented)
      </dd>

      {Object.entries(snapshot.byStatus).map(([status, count]) => (
        <div key={status}>
          <dt>{status}</dt>
          <dd>{count}</dd>
        </div>
      ))}
    </dl>
  )
}
