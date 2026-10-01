import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { resetMortgageBalance } from '../mortgagePayoff/mortgagePayoffQueries'
import { groupReviewCauses, type LoanReview } from './mortgageBalanceReview'
import { listOpenReviewCauses } from './mortgageBalanceReviewQueries'

// Action Queue "Mortgage balance review": worked out from the open causes each time the queue loads. Confirming a
// balance against the latest statement is a same-value reset of THAT balance only (the escrow review stays open when
// principal is confirmed, and vice versa); a different statement figure is entered from the Mortgage tab's Edit.
export function useMortgageBalanceReview() {
  const { accountId } = useAuth()
  const [reviews, setReviews] = useState<LoanReview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!accountId) return
    let current = true
    listOpenReviewCauses(accountId).then(({ data, error: loadError }) => {
      if (!current) return
      setError(loadError ? `Couldn't load mortgage balance reviews: ${loadError.message}` : null)
      setReviews(loadError ? [] : groupReviewCauses(data ?? []))
    })
    return () => {
      current = false
    }
  }, [accountId, reloadKey])

  const confirmBalance = async (review: LoanReview, kind: 'principal' | 'escrow', value: string | null) => {
    setBusy(true)
    const { error: confirmError } = await resetMortgageBalance(
      review.loanId,
      review.balanceVersion,
      kind === 'principal' ? Number(value) : null,
      kind === 'escrow' ? Number(value ?? 0) : null,
    )
    setBusy(false)
    if (confirmError) setError(confirmError.message)
    setReloadKey((k) => k + 1)
  }

  return { reviews, error, busy, confirmBalance }
}
