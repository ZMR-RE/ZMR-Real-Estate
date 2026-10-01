import { Link } from 'react-router-dom'
import { mortgageCurrencyFormatter as money } from '../mortgagePayoff/mortgagePayoffFormat'
import { useMortgageBalanceReview } from './useMortgageBalanceReview'

const KIND_LABEL = { principal: 'Principal balance', escrow: 'Escrow balance' } as const

// Action Queue item: mortgage balances the system deliberately did not change (or refused to change) when an entry
// was voided. Shown until each balance is confirmed or reset against a statement.
export function MortgageBalanceReviewItem() {
  const { reviews, error, busy, confirmBalance } = useMortgageBalanceReview()
  if (error && reviews.length === 0) return <p role="alert">{error}</p>
  if (reviews.length === 0) return null
  return (
    <section className="card" aria-labelledby="mortgage_balance_review_heading">
      <h2 id="mortgage_balance_review_heading" className="property-details-title">
        Mortgage balance review <span className="status-badge status-badge-warning">{reviews.length}</span>
      </h2>
      {error && <p role="alert">{error}</p>}
      {reviews.map((review) => (
        <div key={review.loanId}>
          <h3 className="property-field-group-title">
            {review.propertyId ? <Link to={`/properties/${review.propertyId}`}>{review.label}</Link> : review.label}
          </h3>
          {review.balances.map((balance) => (
            <div key={balance.kind}>
              <p>
                <strong>{KIND_LABEL[balance.kind]}</strong>
                {balance.currentValue !== null && <> · now {money.format(Number(balance.currentValue))}</>}
              </p>
              <ul>
                {balance.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
              <button type="button" disabled={busy} onClick={() => confirmBalance(review, balance.kind, balance.currentValue)}>
                {KIND_LABEL[balance.kind]} matches my latest statement
              </button>{' '}
              <span className="field-hint">If it doesn't, open the property's Mortgage tab and edit the balance.</span>
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
