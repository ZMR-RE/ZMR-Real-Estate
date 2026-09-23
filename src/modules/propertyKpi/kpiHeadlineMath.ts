// Roadmap 7.38 (4) — shared by KpiHeadline and KpiQuickStats so the two
// don't compute "years owned" or "equity gained" two slightly different
// ways.

// Whole years between purchase_date and today. Null when there's no
// purchase date on file — never a guess.
export function computeYearsOwned(purchaseDate: string | null): number | null {
  if (!purchaseDate) return null
  const purchased = new Date(purchaseDate)
  if (Number.isNaN(purchased.getTime())) return null
  const msOwned = Date.now() - purchased.getTime()
  if (msOwned < 0) return null
  return Math.floor(msOwned / (1000 * 60 * 60 * 24 * 365.25))
}

// Equity gained = current equity (latest market value minus current
// mortgage balance, already computed elsewhere via computeEquity) minus
// initial equity (purchase price minus the original loan amount — the
// down payment/cash equity the property started with; a property
// bought in cash, no mortgage_details row on file, started with 100%
// equity, so originalLoanAmount is treated as 0 in that case, not a
// guess — "no mortgage record" already means "no mortgage" everywhere
// else in this app). Null when purchase price or current equity isn't
// known — never a guess at either.
export function computeEquityGained(
  purchasePrice: number | null,
  originalLoanAmount: number | null,
  currentEquity: number | null,
): number | null {
  if (purchasePrice === null || currentEquity === null) return null
  const initialEquity = purchasePrice - (originalLoanAmount ?? 0)
  return currentEquity - initialEquity
}
