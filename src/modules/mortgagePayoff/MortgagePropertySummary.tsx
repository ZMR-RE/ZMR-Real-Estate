import type { MortgageDetails } from './mortgagePayoffQueries'
import type { EquitySnapshot } from './mortgagePayoffMath'

interface MortgagePropertySummaryProps {
  mortgageDetails: MortgageDetails
  marketValue: string | null
  equity: EquitySnapshot | null
  onEdit: () => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export function MortgagePropertySummary({
  mortgageDetails,
  marketValue,
  equity,
  onEdit,
}: MortgagePropertySummaryProps) {
  return (
    <div className="mortgage-property-summary">
      <h2>Mortgage details</h2>
      <dl>
        <dt>Lender</dt>
        <dd>{mortgageDetails.lender_name ?? '—'}</dd>
        <dt>Original loan amount</dt>
        <dd>{currencyFormatter.format(Number(mortgageDetails.original_loan_amount))}</dd>
        <dt>Current balance</dt>
        <dd>{currencyFormatter.format(Number(mortgageDetails.current_balance))}</dd>
        <dt>Interest rate</dt>
        <dd>{Number(mortgageDetails.interest_rate)}%</dd>
        <dt>Monthly payment (P&I)</dt>
        <dd>{currencyFormatter.format(Number(mortgageDetails.monthly_payment))}</dd>
        <dt>Loan start date</dt>
        <dd>{mortgageDetails.loan_start_date}</dd>
        <dt>Term</dt>
        <dd>{mortgageDetails.term_years} years</dd>
      </dl>

      <h3>Equity &amp; LTV</h3>
      {equity ? (
        <dl>
          <dt>Market value</dt>
          <dd>{currencyFormatter.format(Number(marketValue))}</dd>
          <dt>Equity</dt>
          <dd>{currencyFormatter.format(equity.equity)}</dd>
          <dt>Loan-to-value</dt>
          <dd>{percentFormatter.format(equity.ltv)}</dd>
        </dl>
      ) : (
        <p>Set a market value for this property in the Property Registry to see equity and LTV.</p>
      )}

      <button type="button" onClick={onEdit}>
        Edit mortgage details
      </button>
    </div>
  )
}
