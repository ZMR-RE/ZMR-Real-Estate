import type { MarketFinancialSnapshot } from './useMarketFinancialSnapshot'
import type { PropertyValueLogEntry } from '../propertyValueHistory/propertyValueHistoryQueries'

interface MarketFinancialSnapshotCardProps {
  loading: boolean
  error: string | null
  snapshot: MarketFinancialSnapshot
  // Roadmap 7.39 (4) — $/sq ft moved here from Property Information's
  // header row (removed there entirely, not duplicated) — living area
  // is a properties column, not part of MarketFinancialSnapshot, so it
  // arrives as its own prop rather than through the snapshot object.
  squareFootage: string | null
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const percentFormatter = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 })

function asOf(entry: PropertyValueLogEntry): string {
  return `${currencyFormatter.format(Number(entry.value))} (as of ${entry.entry_date}, via ${entry.source})`
}

// A dated trend list, not a chart — no charting library exists anywhere
// in this app yet, and roadmap 7.19 only asks that the history "could
// support" a trend view, not that this pass builds one.
function ValueTrend({ title, history }: { title: string; history: PropertyValueLogEntry[] }) {
  const active = history.filter((entry) => !entry.voided)
  if (active.length < 2) return null

  return (
    <>
      <h4>{title}</h4>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Value</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {active.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.entry_date}</td>
                <td>{currencyFormatter.format(Number(entry.value))}</td>
                <td>{entry.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function MarketFinancialSnapshotCard({ loading, error, snapshot, squareFootage }: MarketFinancialSnapshotCardProps) {
  if (loading) {
    return <p>Loading…</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  const { marketValue, marketValueHistory, rentValue, rentValueHistory, currentBalance, equity, annualRent, ytdNetCashFlow } =
    snapshot

  const livingArea = squareFootage ? Number(squareFootage) : null
  const marketValueNumber = marketValue ? Number(marketValue.value) : null
  const pricePerSqft = marketValueNumber !== null && livingArea ? marketValueNumber / livingArea : null

  return (
    <>
      <dl>
        <dt>Market value</dt>
        <dd>{marketValue ? asOf(marketValue) : 'Not enough data yet'}</dd>

        <dt>$/sq ft</dt>
        <dd>{pricePerSqft !== null ? `${currencyFormatter.format(pricePerSqft)}/sq ft` : 'Not enough data yet'}</dd>

        <dt>Current loan balance</dt>
        <dd>{currentBalance !== null ? currencyFormatter.format(currentBalance) : 'Not enough data yet'}</dd>

        <dt>Net equity</dt>
        <dd>{equity ? currencyFormatter.format(equity.equity) : 'Not enough data yet'}</dd>

        <dt>Loan-to-value</dt>
        <dd>{equity ? percentFormatter.format(equity.ltv) : 'Not enough data yet'}</dd>

        <dt>Annual rent (current leases)</dt>
        <dd>{annualRent !== null ? currencyFormatter.format(annualRent) : 'Not enough data yet'}</dd>

        <dt>Market rent estimate</dt>
        <dd>{rentValue ? asOf(rentValue) : 'Not enough data yet'}</dd>

        <dt>YTD net cash flow</dt>
        <dd>{currencyFormatter.format(ytdNetCashFlow)}</dd>

        <dt>Cash-on-cash ROI</dt>
        <dd>Not enough data yet — total cash invested isn't tracked</dd>
      </dl>

      <ValueTrend title="Market value trend" history={marketValueHistory} />
      <ValueTrend title="Market rent trend" history={rentValueHistory} />
    </>
  )
}
