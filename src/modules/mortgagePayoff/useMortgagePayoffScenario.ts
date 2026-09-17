import { useState } from 'react'
import type { MortgageDetails } from './mortgagePayoffQueries'
import { computePayoffScenario, type ExtraPaymentMode, type PayoffScenarioResult } from './mortgagePayoffMath'

// The payoff-scenario calculator — split out of useMortgageForProperty.ts
// (audit: file size discipline). Pure client-side math over the current
// mortgage_details snapshot; owns no Supabase calls and no refresh of its
// own. clearResult() is called by useMortgageForProperty.ts whenever a
// mutation elsewhere (save, voidMortgage, logPayment) would make a
// previously-computed scenario stale, matching the original hook's
// setScenarioResult(null) calls in those same three places.
export function useMortgagePayoffScenario(mortgageDetails: MortgageDetails | null) {
  const [extraAmount, setExtraAmount] = useState('')
  const [extraMode, setExtraMode] = useState<ExtraPaymentMode>('recurring')
  const [scenarioResult, setScenarioResult] = useState<PayoffScenarioResult | null>(null)
  const [scenarioError, setScenarioError] = useState<string | null>(null)

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

  const clearResult = () => setScenarioResult(null)

  return {
    extraAmount,
    setExtraAmount,
    extraMode,
    setExtraMode,
    scenarioResult,
    scenarioError,
    calculateScenario,
    clearResult,
  }
}
