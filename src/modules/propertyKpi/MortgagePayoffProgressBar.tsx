interface MortgagePayoffProgressBarProps {
  originalLoanAmount: number | null
  currentBalance: number | null
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const percentFormatter = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 })

// Roadmap 7.38 (4) — visual bar showing principal paid off vs.
// remaining balance, placed next to (not replacing) the existing
// equity/LTV figures on the KPI tab's Market & financial snapshot card.
// Principal paid off is distinct from equity: equity also moves with
// market appreciation, this is purely "how much of the original loan
// is gone." Renders nothing without a real mortgage on file (no
// origLoanAmount/currentBalance to show a bar for) rather than an
// empty/zero bar.
//
// Personality pass — color-coded "story" number, same --success/
// --warning/--danger vocabulary as the Units-occupied stat card and
// Action Queue priority (7.15). This replaces the fill's old always-
// --success color (every prior version's own reasoning: "any amount
// paid off is unambiguously positive"). That's true in isolation, but
// doesn't tell "how far along" at a glance the way this task asks for —
// danger is reserved for genuinely notable cases (no progress, or a
// balance that's grown, e.g. a HELOC draw or negative amortization),
// not ordinary early-stage payoff on a normal mortgage, which would be
// a false alarm on every fresh loan. warning covers the broad "still
// well short of halfway" middle; success is reserved for a real
// milestone (halfway or better paid off).
function payoffColorVariant(paidOff: number, percentPaid: number): 'success' | 'warning' | 'danger' {
  if (paidOff <= 0) return 'danger'
  return percentPaid >= 0.5 ? 'success' : 'warning'
}

export function MortgagePayoffProgressBar({ originalLoanAmount, currentBalance }: MortgagePayoffProgressBarProps) {
  if (originalLoanAmount === null || currentBalance === null || originalLoanAmount <= 0) return null

  const paidOff = originalLoanAmount - currentBalance
  const percentPaid = Math.min(Math.max(paidOff / originalLoanAmount, 0), 1)
  const colorVariant = payoffColorVariant(paidOff, percentPaid)

  return (
    <div className="mortgage-payoff-progress">
      <div className="mortgage-payoff-progress-labels">
        <span>{currencyFormatter.format(paidOff)} paid off</span>
        <span className={`mortgage-payoff-progress-percent--${colorVariant}`}>{percentFormatter.format(percentPaid)}</span>
      </div>
      <div className="mortgage-payoff-progress-bar">
        <div className={`mortgage-payoff-progress-fill mortgage-payoff-progress-fill--${colorVariant}`} style={{ width: `${percentPaid * 100}%` }} />
      </div>
      <p className="mortgage-payoff-progress-remaining">
        {currencyFormatter.format(currentBalance)} remaining of {currencyFormatter.format(originalLoanAmount)}
      </p>
    </div>
  )
}
