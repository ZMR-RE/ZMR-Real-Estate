import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createMortgageDetails,
  createMortgagePayment,
  getMortgageDetails,
  listMortgagePayments,
  updateMortgageDetails,
  type MortgageDetails,
  type MortgageDetailsInput,
  type MortgagePayment,
  type MortgagePaymentInput,
} from './mortgagePayoffQueries'
import {
  computeEquity,
  computePayoffScenario,
  type EquitySnapshot,
  type ExtraPaymentMode,
  type PayoffScenarioResult,
} from './mortgagePayoffMath'

const BLANK_MORTGAGE: MortgageDetailsInput = {
  lender_name: null,
  original_loan_amount: '',
  current_balance: '',
  interest_rate: '',
  monthly_payment: '',
  loan_start_date: '',
  term_years: 30,
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

// Same mortgage_details CRUD + scenario logic the standalone Mortgage Payoff
// screen used, minus its property-picker — the Property Profile tab already
// knows which property it's on (roadmap 7.5).
export function useMortgageForProperty(propertyId: string, marketValue: string | null) {
  const { accountId } = useAuth()

  const [mortgageDetails, setMortgageDetails] = useState<MortgageDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [payments, setPayments] = useState<MortgagePayment[]>([])
  const [loggingPayment, setLoggingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const [extraAmount, setExtraAmount] = useState('')
  const [extraMode, setExtraMode] = useState<ExtraPaymentMode>('recurring')
  const [scenarioResult, setScenarioResult] = useState<PayoffScenarioResult | null>(null)
  const [scenarioError, setScenarioError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [{ data, error: fetchError }, { data: paymentRows, error: paymentsFetchError }] = await Promise.all([
      getMortgageDetails(propertyId),
      listMortgagePayments(propertyId),
    ])
    setLoading(false)

    if (fetchError || paymentsFetchError) {
      setError((fetchError ?? paymentsFetchError)!.message)
      return
    }

    setError(null)
    setMortgageDetails(data ?? null)
    setIsEditing(!data)
    setPayments(paymentRows ?? [])
  }, [propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startEditing = () => {
    setError(null)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (!mortgageDetails) return // nothing to fall back to yet
    setError(null)
    setIsEditing(false)
  }

  const save = async (input: MortgageDetailsInput) => {
    if (!accountId) return

    setSaving(true)
    const { data, error: saveError } = mortgageDetails
      ? await updateMortgageDetails(mortgageDetails.id, input)
      : await createMortgageDetails(accountId, propertyId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setError(null)
    setMortgageDetails(data)
    setIsEditing(false)
    setScenarioResult(null)
  }

  // The trigger on mortgage_payments already reduced current_balance in the
  // database by the time this resolves — refresh() re-reads it rather than
  // computing the new balance client-side, so the UI can't drift from what
  // the trigger actually did.
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
    setScenarioResult(null)
    await refresh()
    return true
  }

  const calculateScenario = () => {
    if (!mortgageDetails) return

    const parsedExtra = Number(extraAmount)

    if (!extraAmount || Number.isNaN(parsedExtra) || parsedExtra <= 0) {
      setScenarioError('Enter a positive extra payment amount.')
      setScenarioResult(null)
      return
    }

    const scenario = computePayoffScenario({
      balance: Number(mortgageDetails.current_balance),
      annualRatePercent: Number(mortgageDetails.interest_rate),
      monthlyPayment: Number(mortgageDetails.monthly_payment),
      extraAmount: parsedExtra,
      extraMode,
    })

    if (!scenario) {
      setScenarioError(
        'At this rate, the current payment never pays off this balance. Check the stored mortgage details.',
      )
      setScenarioResult(null)
      return
    }

    setScenarioError(null)
    setScenarioResult(scenario)
  }

  const equity: EquitySnapshot | null =
    mortgageDetails && marketValue
      ? computeEquity(Number(marketValue), Number(mortgageDetails.current_balance))
      : null

  return {
    mortgageDetails,
    loading,
    isEditing,
    saving,
    error,
    formInitialValues: mortgageDetails ?? BLANK_MORTGAGE,
    startEditing,
    cancelEditing,
    save,

    equity,

    payments,
    loggingPayment,
    paymentError,
    paymentFormInitialValues: BLANK_PAYMENT,
    logPayment,

    extraAmount,
    setExtraAmount,
    extraMode,
    setExtraMode,
    scenarioResult,
    scenarioError,
    calculateScenario,
  }
}
