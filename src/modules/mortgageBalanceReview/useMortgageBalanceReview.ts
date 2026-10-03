import { useEffect, useReducer, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { acknowledgeMortgageReviewCause, resetMortgageBalance } from '../mortgagePayoff/mortgagePayoffQueries'
import { reviewActionError } from '../mortgagePayoff/mortgageBalanceIntegrity'
import { groupReviewCauses, type BalanceToConfirm, type LoanReview } from './mortgageBalanceReview'
import { listOpenReviewCauses } from './mortgageBalanceReviewQueries'
import { initialReviewUiState, reviewUiReducer } from './mortgageBalanceReviewState'

// Action Queue "Mortgage balance review": derived from the open causes each time the queue loads (no stored reminder
// rows, so generic task completion can't hide it). Every resolution goes through a controlled database function.
export function useMortgageBalanceReview() {
  const { accountId } = useAuth()
  const [reviews, setReviews] = useState<LoanReview[]>([])
  // Load and action errors are kept apart (mortgageBalanceReviewState.ts): the refresh after an action must not erase
  // the explanation of a refused confirmation.
  const [ui, dispatch] = useReducer(reviewUiReducer, initialReviewUiState)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!accountId) return
    let current = true
    listOpenReviewCauses(accountId).then(({ data, error: loadError }) => {
      if (!current) return
      dispatch({ type: 'loadFinished', error: loadError ? `Couldn't load mortgage balance reviews: ${loadError.message}` : null })
      setReviews(loadError ? [] : groupReviewCauses(data ?? []))
    })
    return () => {
      current = false
    }
  }, [accountId, reloadKey])

  const run = async (action: () => PromiseLike<{ error: { code?: string; message: string } | null }>) => {
    dispatch({ type: 'actionStarted' })
    const { error: actionError } = await action()
    dispatch({ type: 'actionFinished', error: actionError ? reviewActionError(actionError) : null })
    setReloadKey((k) => k + 1)
  }

  // A confirmation is a same-value update of that balance only (M3), resolving exactly the causes shown (B2), with the
  // statement date used to check it when given.
  const confirmBalance = (review: LoanReview, balance: BalanceToConfirm, statementDate: string | null) =>
    run(() =>
      resetMortgageBalance({
        mortgageId: review.loanId,
        principal: balance.kind === 'principal' ? Number(balance.currentValue) : null,
        principalVersion: balance.kind === 'principal' ? balance.version : null,
        escrow: balance.kind === 'escrow' ? Number(balance.currentValue ?? 0) : null,
        escrowVersion: balance.kind === 'escrow' ? balance.version : null,
        statementDate,
        resolveCauseIds: balance.causes.map((c) => c.id),
      }),
    )

  const acknowledge = (causeId: string) => run(() => acknowledgeMortgageReviewCause(causeId))

  return { reviews, loadError: ui.loadError, actionError: ui.actionError, busy: ui.busy, confirmBalance, acknowledge }
}
