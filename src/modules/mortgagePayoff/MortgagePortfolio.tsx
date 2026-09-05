import { useMortgagePortfolio } from './useMortgagePortfolio'
import { MortgagePortfolioTable } from './MortgagePortfolioTable'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

// Roadmap 7.6 — portfolio-wide rollup. Per-property mortgage entry/editing
// now lives on each Property Profile's Mortgage tab (7.5); this screen is
// read-only totals across the whole portfolio, not an editor.
export function MortgagePortfolio() {
  const { entries, totals, loading, error } = useMortgagePortfolio()

  if (loading) {
    return <p>Loading…</p>
  }

  return (
    <div>
      <h1>Mortgage Portfolio</h1>
      {error && <p role="alert">{error}</p>}

      <dl className="portfolio-totals">
        <dt>Total mortgage balance</dt>
        <dd>{currencyFormatter.format(totals.totalBalance)}</dd>
        <dt>Total equity</dt>
        <dd>{currencyFormatter.format(totals.totalEquity)}</dd>
        <dt>Overall loan-to-value</dt>
        <dd>{totals.overallLtv !== null ? percentFormatter.format(totals.overallLtv) : '—'}</dd>
      </dl>

      {totals.missingMarketValueCount > 0 && (
        <p>
          {totals.missingMarketValueCount}{' '}
          {totals.missingMarketValueCount === 1 ? 'property is' : 'properties are'} missing a market
          value and excluded from equity/LTV — total balance above still includes{' '}
          {totals.missingMarketValueCount === 1 ? 'it' : 'them'}.
        </p>
      )}

      <MortgagePortfolioTable entries={entries} />
    </div>
  )
}
