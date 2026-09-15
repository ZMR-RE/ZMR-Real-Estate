import type { MarketFinancialSnapshot } from './useMarketFinancialSnapshot'

interface MarketFinancialSnapshotCardProps {
  loading: boolean
  error: string | null
  snapshot: MarketFinancialSnapshot
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const percentFormatter = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 })

export function MarketFinancialSnapshotCard({ loading, error, snapshot }: MarketFinancialSnapshotCardProps) {
  if (loading) {
    return <p>Loading…</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  const { marketValue, currentBalance, equity, annualRent, ytdNetCashFlow } = snapshot

  return (
    <dl>
      <dt>Market value</dt>
      <dd>{marketValue !== null ? currencyFormatter.format(marketValue) : 'Not enough data yet'}</dd>

      <dt>Current loan balance</dt>
      <dd>{currentBalance !== null ? currencyFormatter.format(currentBalance) : 'Not enough data yet'}</dd>

      <dt>Net equity</dt>
      <dd>{equity ? currencyFormatter.format(equity.equity) : 'Not enough data yet'}</dd>

      <dt>Loan-to-value</dt>
      <dd>{equity ? percentFormatter.format(equity.ltv) : 'Not enough data yet'}</dd>

      <dt>Annual rent</dt>
      <dd>{annualRent !== null ? currencyFormatter.format(annualRent) : 'Not enough data yet'}</dd>

      <dt>YTD net cash flow</dt>
      <dd>{currencyFormatter.format(ytdNetCashFlow)}</dd>

      <dt>Cash-on-cash ROI</dt>
      <dd>Not enough data yet — total cash invested isn't tracked</dd>
    </dl>
  )
}
