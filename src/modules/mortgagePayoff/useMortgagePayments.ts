import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createMortgagePayment,
  listMortgagePayments,
  voidMortgageActivity,
  type MortgagePayment,
  type MortgagePaymentInput,
} from './mortgagePayoffQueries'
import { createHistoryPayment, listHistoryPayments, voidHistoryEntry } from './mortgageHistoryQueries'
import { friendlyDatabaseError, voidRefusalMessage } from './mortgageBalanceIntegrity'
import { saveMortgageEntry } from './mortgageHistoryEntry'

// One list row: a normal payment, or a history-only entry (option B) already included in the opening balance.
export type PaymentRow = MortgagePayment & { history: boolean }

// An identical entry was found; the form keeps its values and offers "Record anyway" (contract rule 5).
export interface PendingDuplicate {
  input: MortgagePaymentInput
  historyOnly: boolean
  total: number
  message: string
}

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

  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [duplicate, setDuplicate] = useState<PendingDuplicate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingPayment, setLoggingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [{ data, error: fetchError }, { data: history, error: historyError }] = await Promise.all([
      listMortgagePayments(propertyId),
      listHistoryPayments(propertyId),
    ])
    setLoading(false)

    if (fetchError || historyError) {
      setError((fetchError ?? historyError)!.message)
      return
    }

    setError(null)
    const rows: PaymentRow[] = [
      ...(data ?? []).map((p) => ({ ...p, history: false })),
      ...(history ?? []).map((h) => ({ ...h, void_outcome: null, history: true })),
    ]
    rows.sort((a, b) => (a.payment_date < b.payment_date ? 1 : a.payment_date > b.payment_date ? -1 : 0))
    setPayments(rows)
  }, [propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // The trigger on mortgage_payments already reduced current_balance in the
  // database by the time this resolves — the composition hook re-reads it
  // via useMortgageDetails.refresh() rather than computing the new balance
  // client-side, so the UI can't drift from what the trigger actually did.
  const attempt = async (input: MortgagePaymentInput, historyOnly: boolean, ack: number | null): Promise<boolean> => {
    if (!accountId) return false
    setLoggingPayment(true)
    const outcome = await saveMortgageEntry(
      (a) => (historyOnly ? createHistoryPayment(accountId, propertyId, input, a) : createMortgagePayment(accountId, propertyId, input, a)),
      input.payment_date,
      ack,
    )
    setLoggingPayment(false)
    if (outcome.kind === 'duplicate') {
      setPaymentError(null)
      setDuplicate({ input, historyOnly, total: outcome.counts.total, message: outcome.message })
      return false
    }
    setDuplicate(null)
    setPaymentError(outcome.kind === 'error' ? outcome.message : null)
    return outcome.kind === 'saved'
  }

  // historyOnly: "already included in my opening balance" (option B) — recorded, never moves the balance.
  const logPayment = (input: MortgagePaymentInput, historyOnly = false) => attempt(input, historyOnly, null)
  // "Record anyway (it's a separate payment)": resubmit with the count the user was shown; the database recounts.
  const confirmDuplicate = () => (duplicate ? attempt(duplicate.input, duplicate.historyOnly, duplicate.total) : Promise.resolve(false))
  const dismissDuplicate = () => setDuplicate(null)

  // The only "removal" path (roadmap 9.20) — never a hard DELETE. The database reverses the entry's balance effect
  // exactly once when that is safe; otherwise it voids without adjusting (the row shows why), or refuses and opens an
  // Action Queue balance review (balance integrity, 20261004100000).
  const voidPayment = async (id: string): Promise<boolean> => {
    if (payments.find((p) => p.id === id)?.history) {
      // A history entry's void never touches a balance (no void core involved).
      setLoggingPayment(true)
      const { error: historyVoidError } = await voidHistoryEntry('payment', id)
      setLoggingPayment(false)
      setPaymentError(historyVoidError ? friendlyDatabaseError(historyVoidError) : null)
      return !historyVoidError
    }
    setLoggingPayment(true)
    const { data: result, error: voidError } = await voidMortgageActivity('payment', id)
    setLoggingPayment(false)

    if (voidError) {
      setPaymentError(friendlyDatabaseError(voidError))
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
    duplicate,
    confirmDuplicate,
    dismissDuplicate,
    refresh,
  }
}
