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
export function MortgagePayoffProgressBar({ originalLoanAmount, currentBalance }: MortgagePayoffProgressBarProps) {
  if (originalLoanAmount === null || currentBalance === null || originalLoanAmount <= 0) return null

  const paidOff = originalLoanAmount - currentBalance
  const percentPaid = Math.min(Math.max(paidOff / originalLoanAmount, 0), 1)

  return (
    <div className="mortgage-payoff-progress">
      <div className="mortgage-payoff-progress-labels">
        <span>{currencyFormatter.format(paidOff)} paid off</span>
        <span>{percentFormatter.format(percentPaid)}</span>
      </div>
      <div className="mortgage-payoff-progress-bar">
        <div className="mortgage-payoff-progress-fill" style={{ width: `${percentPaid * 100}%` }} />
      </div>
      <p className="mortgage-payoff-progress-remaining">
        {currencyFormatter.format(currentBalance)} remaining of {currencyFormatter.format(originalLoanAmount)}
      </p>
    </div>
  )
}
