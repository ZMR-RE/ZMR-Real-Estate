import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createMortgagePayment,
  listMortgagePayments,
  voidMortgageActivity,
  type MortgagePayment,
  type MortgagePaymentInput,
} from './mortgagePayoffQueries'
import { voidRefusalMessage } from './mortgageBalanceIntegrity'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

const BLANK_PAYMENT: MortgagePaymentInput = {
  payment_date: todayDateString(),
  amount: '',
  principal_amount: '',
  interest_amount: '',
}

// The mortgage_payments ledger (roadmap 9.14) + its void path (9.20) —
// split out of useMortgageForProperty.ts (audit: file size discipline).
// Logging/voiding a payment also moves mortgage_details.current_balance
// via a DB trigger; useMortgageForProperty.ts (the composition hook) is
// responsible for re-fetching mortgage details afterward, not this hook.
export function useMortgagePayments(propertyId: string) {
  const { accountId } = useAuth()

  const [payments, setPayments] = useState<MortgagePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingPayment, setLoggingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchError } = await listMortgagePayments(propertyId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setError(null)
    setPayments(data ?? [])
  }, [propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // The trigger on mortgage_payments already reduced current_balance in the
  // database by the time this resolves — the composition hook re-reads it
  // via useMortgageDetails.refresh() rather than computing the new balance
  // client-side, so the UI can't drift from what the trigger actually did.
  const logPayment = async (input: MortgagePaymentInput): Promise<boolean> => {
    if (!accountId) return false

    setLoggingPayment(true)
    const { error: paymentSaveError } = await createMortgagePayment(accountId, propertyId, input)
    setLoggingPayment(false)

    if (paymentSaveError) {
      setPaymentError(paymentSaveError.message)
      return false
    }

    setPaymentError(null)
    return true
  }

  // The only "removal" path (roadmap 9.20) — never a hard DELETE. The database reverses the entry's balance effect
  // exactly once when that is safe; otherwise it voids without adjusting (the row shows why), or refuses and opens an
  // Action Queue balance review (balance integrity, 20261004100000).
  const voidPayment = async (id: string): Promise<boolean> => {
    setLoggingPayment(true)
    const { data: result, error: voidError } = await voidMortgageActivity('payment', id)
    setLoggingPayment(false)

    if (voidError) {
      setPaymentError(voidError.message)
      return false
    }
    // A refused void leaves the entry active; the database already opened the Action Queue balance review.
    const refusal = voidRefusalMessage(result?.outcome ?? null)
    if (refusal) {
      setPaymentError(refusal)
      return false
    }

    setPaymentError(null)
    return true
  }

  return {
    payments,
    loading,
    error,
    loggingPayment,
    paymentError,
    paymentFormInitialValues: BLANK_PAYMENT,
    logPayment,
    voidPayment,
    refresh,
  }
}
