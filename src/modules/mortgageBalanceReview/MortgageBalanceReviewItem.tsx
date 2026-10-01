import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mortgageCurrencyFormatter as money } from '../mortgagePayoff/mortgagePayoffFormat'
import { useMortgageBalanceReview } from './useMortgageBalanceReview'

const KIND_LABEL = { principal: 'Principal balance', escrow: 'Escrow balance' } as const

// Action Queue item: mortgage balances to check against a statement — entries recorded for a period the balance may
// already include, voids the system deliberately didn't reverse, and voids it refused (those entries are still active).
export function MortgageBalanceReviewItem() {
  const { reviews, error, busy, confirmBalance, acknowledge } = useMortgageBalanceReview()
  const [statementDate, setStatementDate] = useState('')
  if (error && reviews.length === 0) return <p role="alert">{error}</p>
  if (reviews.length === 0) return null
  return (
    <section className="card" aria-labelledby="mortgage_balance_review_heading">
      <h2 id="mortgage_balance_review_heading" className="property-details-title">
        Mortgage balance review <span className="status-badge status-badge-warning">{reviews.length}</span>
      </h2>
      {error && <p role="alert">{error}</p>}
      <label htmlFor="mortgage_review_statement_date">Statement date you are checking against (optional)</label>
      <input id="mortgage_review_statement_date" type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} />
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
                {balance.causes.map((cause) => (
                  <li key={cause.id}>
                    {cause.text}
                    {cause.stillActive && <span className="status-badge status-badge-neutral">Entry still active</span>}
                  </li>
                ))}
              </ul>
              <button type="button" disabled={busy} onClick={() => confirmBalance(review, balance, statementDate || null)}>
                {KIND_LABEL[balance.kind]} matches my statement
              </button>{' '}
              <span className="field-hint">
                Closes only the items listed above. If the balance is wrong, update it on the property's Mortgage tab instead.
              </span>
            </div>
          ))}
          {review.legacy.map((item) => (
            <p key={item.id}>
              {item.text}{' '}
              <button type="button" disabled={busy} onClick={() => acknowledge(item.id)}>
                Checked
              </button>
            </p>
          ))}
        </div>
      ))}
    </section>
  )
}
