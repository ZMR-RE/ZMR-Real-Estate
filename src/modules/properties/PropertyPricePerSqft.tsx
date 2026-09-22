import type { Property } from './propertiesQueries'

interface PropertyPricePerSqftProps {
  property: Property
  // Roadmap 7.32 (7) — latest market value (7.19's dated log, not a
  // stored column), passed down from PropertyProfile's own already-
  // fetched `latestMarketValue` (same value the Mortgage tab's equity/
  // LTV uses) rather than this component fetching it a second time.
  // That state already refreshes on every value-history change
  // (onValueHistoryChanged={refresh}), so this stat never goes stale
  // relative to a market-value entry logged elsewhere on the same
  // Overview tab, without a page reload.
  marketValue: number | null
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// "Not enough data yet" matches MarketFinancialSnapshotCard's exact
// wording for the same kind of gap.
export function PropertyPricePerSqft({ property, marketValue }: PropertyPricePerSqftProps) {
  const livingArea = property.square_footage ? Number(property.square_footage) : null
  const pricePerSqft = marketValue !== null && livingArea ? marketValue / livingArea : null

  return (
    <div className="field">
      <dt>$/sq ft</dt>
      <dd>{pricePerSqft !== null ? `${currencyFormatter.format(pricePerSqft)}/sq ft` : 'Not enough data yet'}</dd>
    </div>
  )
}
