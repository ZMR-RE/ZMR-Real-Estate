import { computeYearsOwned } from './kpiHeadlineMath'

interface KpiQuickStatsProps {
  purchaseDate: string | null
  currentEquity: number | null
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// Roadmap 7.38 (4) — 3 quick numbers at the top of the KPI tab:
// estimated current equity, years owned, and cash-on-cash return.
// Cash-on-cash return is NOT computed here — it isn't computed
// anywhere in this app; MarketFinancialSnapshotCard's own "Cash-on-cash
// ROI: Not enough data yet — total cash invested isn't tracked" is the
// only existing treatment of it, reused verbatim rather than inventing
// a second calculation this app has no data to back.
export function KpiQuickStats({ purchaseDate, currentEquity }: KpiQuickStatsProps) {
  const yearsOwned = computeYearsOwned(purchaseDate)

  return (
    <dl className="kpi-quick-stats">
      <div className="field">
        <dt>Estimated current equity</dt>
        <dd>{currentEquity !== null ? currencyFormatter.format(currentEquity) : 'Not enough data yet'}</dd>
      </div>
      <div className="field">
        <dt>Years owned</dt>
        <dd>{yearsOwned !== null ? yearsOwned : 'Not enough data yet'}</dd>
      </div>
      <div className="field">
        <dt>Cash-on-cash return</dt>
        <dd>Not enough data yet — total cash invested isn't tracked</dd>
      </div>
    </dl>
  )
}
