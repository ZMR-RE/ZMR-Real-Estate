import { useMortgageDetails } from './useMortgageDetails'
import { useMortgagePayments } from './useMortgagePayments'
import { useMortgageEscrow } from './useMortgageEscrow'
import { useMortgagePayoffScenario } from './useMortgagePayoffScenario'
import type { MortgageDetailsInput, MortgageEscrowTransactionInput, MortgagePaymentInput } from './mortgagePayoffQueries'

// Same mortgage_details CRUD + scenario logic the standalone Mortgage Payoff
// screen used, minus its property-picker — the Property Profile tab already
// knows which property it's on (roadmap 7.5).
//
// Composes the four mortgagePayoff concerns (audit: file size discipline
// split) — useMortgageDetails, useMortgagePayments, useMortgageEscrow,
// useMortgagePayoffScenario — each of which owns its own data and refresh.
// This hook's only job is wiring the one real cross-hook dependency
// (logging/voiding a payment or escrow transaction moves
// mortgage_details.current_balance/escrow_balance via a DB trigger, so
// every mutation here re-fetches all three, exactly like the original
// single-refresh implementation did) and merging their return values into
// the same flat shape PropertyProfileMortgageTab.tsx already consumes.
export function useMortgageForProperty(propertyId: string, marketValue: string | null) {
  const details = useMortgageDetails(propertyId, marketValue)
  const payments = useMortgagePayments(propertyId)
  const escrow = useMortgageEscrow(propertyId)
  const scenario = useMortgagePayoffScenario(details.mortgageDetails)

  const loading = details.loading || payments.loading || escrow.loading
  const error = details.error ?? payments.error ?? escrow.error

  const refreshAll = async () => {
    await Promise.all([details.refresh(), payments.refresh(), escrow.refresh()])
  }

  const save = async (input: MortgageDetailsInput) => {
    const ok = await details.save(input)
    if (ok) scenario.clearResult()
  }

  const voidMortgage = async (): Promise<boolean> => {
    const ok = await details.voidMortgage()
    if (ok) {
      scenario.clearResult()
      await refreshAll()
    }
    return ok
  }

  const logPayment = async (input: MortgagePaymentInput): Promise<boolean> => {
    const ok = await payments.logPayment(input)
    if (ok) {
      scenario.clearResult()
      await refreshAll()
    }
    return ok
  }

  const voidPayment = async (id: string): Promise<boolean> => {
    const ok = await payments.voidPayment(id)
    if (ok) await refreshAll()
    return ok
  }

  const logEscrowTransaction = async (input: MortgageEscrowTransactionInput): Promise<boolean> => {
    const ok = await escrow.logEscrowTransaction(input)
    if (ok) await refreshAll()
    return ok
  }

  const voidEscrowTransaction = async (id: string): Promise<boolean> => {
    const ok = await escrow.voidEscrowTransaction(id)
    if (ok) await refreshAll()
    return ok
  }

  return {
    mortgageDetails: details.mortgageDetails,
    loading,
    isEditing: details.isEditing,
    saving: details.saving,
    error,
    formInitialValues: details.formInitialValues,
    startEditing: details.startEditing,
    cancelEditing: details.cancelEditing,
    save,
    voidMortgage,

    equity: details.equity,

    payments: payments.payments,
    loggingPayment: payments.loggingPayment,
    paymentError: payments.paymentError,
    paymentFormInitialValues: payments.paymentFormInitialValues,
    logPayment,
    voidPayment,

    escrowTransactions: escrow.escrowTransactions,
    loggingEscrowTransaction: escrow.loggingEscrowTransaction,
    escrowTransactionError: escrow.escrowTransactionError,
    escrowTransactionFormInitialValues: escrow.escrowTransactionFormInitialValues,
    logEscrowTransaction,
    voidEscrowTransaction,

    extraAmount: scenario.extraAmount,
    setExtraAmount: scenario.setExtraAmount,
    extraMode: scenario.extraMode,
    setExtraMode: scenario.setExtraMode,
    scenarioResult: scenario.scenarioResult,
    scenarioError: scenario.scenarioError,
    calculateScenario: scenario.calculateScenario,
  }
}
