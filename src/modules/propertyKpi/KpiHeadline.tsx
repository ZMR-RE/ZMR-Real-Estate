import { computeEquityGained, computeYearsOwned } from './kpiHeadlineMath'

interface KpiHeadlineProps {
  purchasePrice: string | null
  purchaseDate: string | null
  originalLoanAmount: number | null
  currentEquity: number | null
}

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 0,
})

// Roadmap 7.38 (4) — one auto-generated summary sentence, purely
// derived from existing data (purchase price/date, mortgage original
// loan amount, latest market value) — no new entry, no guessed figure.
// Shows whichever half is actually computable rather than an
// all-or-nothing gate: "Owned 8 years" alone if equity can't be
// computed yet, "$176K equity gained" alone if there's no purchase
// date on file. Renders nothing (not "Not enough data yet") when
// neither half has anything to say — a brand-new property with no
// purchase date and no market value logged yet has no headline to show.
export function KpiHeadline({ purchasePrice, purchaseDate, originalLoanAmount, currentEquity }: KpiHeadlineProps) {
  const yearsOwned = computeYearsOwned(purchaseDate)
  const equityGained = computeEquityGained(
    purchasePrice !== null ? Number(purchasePrice) : null,
    originalLoanAmount,
    currentEquity,
  )

  const parts: string[] = []
  if (yearsOwned !== null) {
    parts.push(`Owned ${yearsOwned} ${yearsOwned === 1 ? 'year' : 'years'}`)
  }
  if (equityGained !== null) {
    const amount = compactCurrencyFormatter.format(Math.abs(equityGained))
    parts.push(`${amount} equity ${equityGained >= 0 ? 'gained' : 'lost'}`)
  }

  if (parts.length === 0) return null

  return <p className="kpi-headline">{parts.join(' · ')}</p>
}
