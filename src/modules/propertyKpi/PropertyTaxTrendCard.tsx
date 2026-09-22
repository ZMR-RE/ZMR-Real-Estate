import type { PropertyTaxTrendYear } from './usePropertyTaxTrend'

interface PropertyTaxTrendCardProps {
  loading: boolean
  error: string | null
  years: PropertyTaxTrendYear[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})

export function PropertyTaxTrendCard({ loading, error, years }: PropertyTaxTrendCardProps) {
  if (loading) {
    return <p>Loading…</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  if (years.length === 0) {
    return (
      <p className="empty-state">
        No property tax installments logged yet — add them on the Overview tab to see the trend here.
      </p>
    )
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Total tax</th>
            <th>Change from prior year</th>
          </tr>
        </thead>
        <tbody>
          {years.map((year) => (
            <tr key={year.taxYear}>
              <td>{year.taxYear}</td>
              <td>{currencyFormatter.format(year.total)}</td>
              <td>
                {year.changeFromPriorYear === null
                  ? '—'
                  : `${currencyFormatter.format(year.changeFromPriorYear)}${
                      year.changePercent !== null ? ` (${percentFormatter.format(year.changePercent)})` : ''
                    }`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
