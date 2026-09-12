// Standard straight-line depreciation for residential rental real estate
// (IRS Schedule E / Form 4562): cost basis recovered evenly over 27.5
// years. Land isn't depreciable, but the roadmap item's own cost-basis
// formula is purchase price + capital improvements with no land term —
// there's no land value captured anywhere in this app to subtract, and
// guessing one would violate the Data integrity rule, so this figure
// should be read as an approximation until land value is tracked
// separately (surfaced as a caveat in the UI, not hidden).
export const RESIDENTIAL_DEPRECIATION_YEARS = 27.5

export interface DepreciationResult {
  costBasis: number
  annualDepreciation: number
}

export function calculateDepreciation(purchasePrice: number, capitalImprovements: number): DepreciationResult {
  const costBasis = purchasePrice + capitalImprovements
  const annualDepreciation = Math.round((costBasis / RESIDENTIAL_DEPRECIATION_YEARS) * 100) / 100
  return { costBasis, annualDepreciation }
}
