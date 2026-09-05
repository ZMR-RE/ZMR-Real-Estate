import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createMortgageDetails,
  getMortgageDetails,
  updateMortgageDetails,
  type MortgageDetails,
  type MortgageDetailsInput,
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

  const [extraAmount, setExtraAmount] = useState('')
  const [extraMode, setExtraMode] = useState<ExtraPaymentMode>('recurring')
  const [scenarioResult, setScenarioResult] = useState<PayoffScenarioResult | null>(null)
  const [scenarioError, setScenarioError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchError } = await getMortgageDetails(propertyId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setError(null)
    setMortgageDetails(data ?? null)
    setIsEditing(!data)
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

    extraAmount,
    setExtraAmount,
    extraMode,
    setExtraMode,
    scenarioResult,
    scenarioError,
    calculateScenario,
  }
}
