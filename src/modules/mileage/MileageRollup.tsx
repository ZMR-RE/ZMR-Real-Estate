import { useMileageRollup } from './useMileageRollup'

interface MileageRollupProps {
  year: number
}

export function MileageRollup({ year }: MileageRollupProps) {
  const { summary, loading, error } = useMileageRollup(year)

  return (
    <div>
      <h2>Mileage by property ({year})</h2>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : summary.length === 0 ? (
        <p className="empty-state">No mileage logged for this year.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Total miles</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.propertyId}>
                <td>{row.propertyName}</td>
                <td>{row.totalMiles.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
