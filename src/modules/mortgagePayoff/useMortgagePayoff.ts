import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listProperties, type Property } from '../properties/propertiesQueries'
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

export function useMortgagePayoff() {
  const { accountId } = useAuth()

  const [properties, setProperties] = useState<Property[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [propertyId, setPropertyId] = useState<string | null>(null)

  const [mortgageDetails, setMortgageDetails] = useState<MortgageDetails | null>(null)
  const [mortgageLoading, setMortgageLoading] = useState(false)
  const [isEditingMortgage, setIsEditingMortgage] = useState(false)
  const [savingMortgage, setSavingMortgage] = useState(false)
  const [mortgageError, setMortgageError] = useState<string | null>(null)

  const [extraAmount, setExtraAmount] = useState('')
  const [extraMode, setExtraMode] = useState<ExtraPaymentMode>('recurring')
  const [scenarioResult, setScenarioResult] = useState<PayoffScenarioResult | null>(null)
  const [scenarioError, setScenarioError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    setPropertiesLoading(true)
    listProperties(accountId).then(({ data }) => {
      setProperties(data ?? [])
      setPropertiesLoading(false)
    })
  }, [accountId])

  const refreshMortgageDetails = useCallback(async (forPropertyId: string) => {
    setMortgageLoading(true)
    const { data, error } = await getMortgageDetails(forPropertyId)
    setMortgageLoading(false)

    if (error) {
      setMortgageError(error.message)
      return
    }

    setMortgageError(null)
    setMortgageDetails(data ?? null)
    setIsEditingMortgage(!data)
  }, [])

  const selectProperty = (id: string) => {
    setPropertyId(id)
    setMortgageDetails(null)
    setScenarioResult(null)
    setScenarioError(null)
    setExtraAmount('')
    refreshMortgageDetails(id)
  }

  const startEditingMortgage = () => {
    setMortgageError(null)
    setIsEditingMortgage(true)
  }

  const cancelEditingMortgage = () => {
    if (!mortgageDetails) return // nothing to fall back to yet
    setMortgageError(null)
    setIsEditingMortgage(false)
  }

  const saveMortgageDetails = async (input: MortgageDetailsInput) => {
    if (!accountId || !propertyId) return

    setSavingMortgage(true)
    const { data, error } = mortgageDetails
      ? await updateMortgageDetails(mortgageDetails.id, input)
      : await createMortgageDetails(accountId, propertyId, input)
    setSavingMortgage(false)

    if (error) {
      setMortgageError(error.message)
      return
    }

    setMortgageError(null)
    setMortgageDetails(data)
    setIsEditingMortgage(false)
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
      setScenarioError('At this rate, the current payment never pays off this balance. Check the stored mortgage details.')
      setScenarioResult(null)
      return
    }

    setScenarioError(null)
    setScenarioResult(scenario)
  }

  const selectedProperty = properties.find((p) => p.id === propertyId) ?? null
  const propertyOptions = properties.map((p) => ({ id: p.id, label: p.name }))

  const equity: EquitySnapshot | null =
    mortgageDetails && selectedProperty?.market_value
      ? computeEquity(Number(selectedProperty.market_value), Number(mortgageDetails.current_balance))
      : null

  return {
    propertyOptions,
    propertiesLoading,
    propertyId,
    selectProperty,
    selectedProperty,

    mortgageDetails,
    mortgageLoading,
    isEditingMortgage,
    savingMortgage,
    mortgageError,
    mortgageFormInitialValues: mortgageDetails ?? BLANK_MORTGAGE,
    startEditingMortgage,
    cancelEditingMortgage,
    saveMortgageDetails,

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
