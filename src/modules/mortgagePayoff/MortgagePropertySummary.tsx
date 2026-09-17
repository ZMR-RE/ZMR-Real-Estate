import type { MortgageDetails } from './mortgagePayoffQueries'
import type { EquitySnapshot } from './mortgagePayoffMath'

interface MortgagePropertySummaryProps {
  mortgageDetails: MortgageDetails
  marketValue: string | null
  equity: EquitySnapshot | null
  onEdit: () => void
  onVoid: () => void
  voiding: boolean
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
  onVoid,
  voiding,
}: MortgagePropertySummaryProps) {
  return (
    <div className="mortgage-property-summary">
      <h2>Mortgage details</h2>
      <dl>
        <dt>Lender</dt>
        <dd>{mortgageDetails.lender_name ?? '—'}</dd>
        <dt>Original loan amount</dt>
        <dd>{currencyFormatter.format(Number(mortgageDetails.original_loan_amount))}</dd>
        <dt>Current balance (principal)</dt>
        <dd>{currencyFormatter.format(Number(mortgageDetails.current_balance))}</dd>
        <dt>Escrow balance</dt>
        <dd>
          {mortgageDetails.escrow_balance !== null
            ? currencyFormatter.format(Number(mortgageDetails.escrow_balance))
            : '— no escrow account on file'}
        </dd>
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
        <p>Log a market value for this property (Overview tab) to see equity and LTV.</p>
      )}

      <button type="button" onClick={onEdit}>
        Edit mortgage details
      </button>
      <button type="button" onClick={onVoid} disabled={voiding}>
        {voiding ? 'Voiding…' : 'Void mortgage'}
      </button>
    </div>
  )
}
