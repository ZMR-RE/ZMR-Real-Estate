import { useCostBasis } from './useCostBasis'
import { calculateDepreciation } from './depreciationCalculations'

interface CostBasisSectionProps {
  propertyId: string
  purchasePrice: string | null
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Roadmap 9.15 — read-only; there's no edit action here because the only
// input this feature adds (purchase price) is edited on the Overview
// tab's existing property form, and capital improvements are never
// directly editable at all (see depreciationQueries.ts).
export function CostBasisSection({ propertyId, purchasePrice }: CostBasisSectionProps) {
  const { capitalImprovements, loading, error } = useCostBasis(propertyId)

  return (
    <section>
      <h2>Cost Basis &amp; Depreciation</h2>
      {error && <p role="alert">{error}</p>}

      {purchasePrice === null ? (
        <p>Enter a purchase price on this property's Overview tab to calculate depreciation.</p>
      ) : loading ? (
        <p>Loading…</p>
      ) : (
        (() => {
          const { costBasis, annualDepreciation } = calculateDepreciation(Number(purchasePrice), capitalImprovements)
          return (
            <dl>
              <dt>Purchase price</dt>
              <dd>{currencyFormatter.format(Number(purchasePrice))}</dd>
              <dt>Capital improvements</dt>
              <dd>{currencyFormatter.format(capitalImprovements)} (from transactions marked "Improvement")</dd>
              <dt>Total cost basis</dt>
              <dd>{currencyFormatter.format(costBasis)}</dd>
              <dt>Annual depreciation (27.5-year straight-line)</dt>
              <dd>{currencyFormatter.format(annualDepreciation)} / year</dd>
            </dl>
          )
        })()
      )}
      <p>
        Approximate: this cost basis doesn't separately exclude land value (not yet tracked), so the depreciable
        amount may be overstated versus what a preparer files on Schedule E.
      </p>
    </section>
  )
}
