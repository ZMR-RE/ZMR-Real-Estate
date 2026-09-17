import { PropertyValueLedger } from './PropertyValueLedger'

interface PropertyValueHistorySectionProps {
  propertyId: string
  onChanged: () => Promise<void>
}

// Roadmap 7.19 — replaces the old static properties.market_value field
// with two dated, sourced logs (market value + market rent estimate),
// each tracked over time instead of overwritten in place. Rent value here
// is a market/asking-rent estimate (e.g. a Zillow rent estimate),
// distinct from tenant_units.rent_amount (8.5), which is the actual
// contracted lease rent — this is tracked "even while occupied," per the
// roadmap item's own wording. Feeds the KPI tab's Market & Financial
// Snapshot card (7.13).
export function PropertyValueHistorySection({ propertyId, onChanged }: PropertyValueHistorySectionProps) {
  return (
    <>
      <PropertyValueLedger
        propertyId={propertyId}
        metric="market_value"
        title="Market value"
        emptyMessage="No market value logged yet."
        onChanged={onChanged}
      />
      <PropertyValueLedger
        propertyId={propertyId}
        metric="rent_value"
        title="Market rent estimate"
        emptyMessage="No rent value logged yet."
        onChanged={onChanged}
      />
    </>
  )
}
