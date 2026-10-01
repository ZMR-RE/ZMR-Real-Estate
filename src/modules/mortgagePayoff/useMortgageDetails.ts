import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createMortgageDetails,
  getMortgageDetails,
  resetMortgageBalance,
  updateMortgageDetails,
  voidMortgageDetails,
  type MortgageDetails,
  type MortgageDetailsInput,
} from './mortgagePayoffQueries'
import { computeEquity, type EquitySnapshot } from './mortgagePayoffMath'
import { friendlyDatabaseError } from './mortgageBalanceIntegrity'
import { saveMortgageDetails } from './mortgageDetailsSave'

const BLANK_MORTGAGE: MortgageDetailsInput = {
  lender_name: null,
  original_loan_amount: '',
  current_balance: '',
  interest_rate: '',
  monthly_payment: '',
  loan_start_date: '',
  term_years: 30,
  escrow_balance: null,
  loan_number: null,
  loan_type: null,
}

// mortgage_details CRUD + void (roadmap 9.20) + the equity/LTV snapshot
// derived from it — split out of useMortgageForProperty.ts (audit: file
// size discipline). Payments, escrow, and the payoff scenario calculator
// are their own hooks; useMortgageForProperty.ts (the composition hook)
// re-fetches this hook's data after a payment/escrow mutation too, since
// those move current_balance/escrow_balance via a DB trigger this hook
// doesn't know about.
export function useMortgageDetails(propertyId: string, marketValue: string | null) {
  const { accountId } = useAuth()

  const [mortgageDetails, setMortgageDetails] = useState<MortgageDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  // error: the loan couldn't be loaded (the tab can't show it). detailsError: a save or void was refused — shown in
  // the box the user acted on, which stays as it was.
  const [error, setError] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)

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
    setDetailsError(null)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (!mortgageDetails) return // nothing to fall back to yet
    setDetailsError(null)
    setIsEditing(false)
  }

  // A refused save keeps the form open with the user's entries and shows the reason inside it (detailsError) —
  // never the tab-level load error. The flow itself, including every refusal, lives in mortgageDetailsSave.ts.
  const save = async (input: MortgageDetailsInput): Promise<boolean> => {
    if (!accountId) return false
    setSaving(true)
    const result = await saveMortgageDetails(
      {
        create: (values) => createMortgageDetails(accountId, propertyId, values),
        reset: resetMortgageBalance,
        update: updateMortgageDetails,
        fetchLatest: () => getMortgageDetails(propertyId),
      },
      mortgageDetails,
      input,
    )
    setSaving(false)
    if (result.details) setMortgageDetails(result.details)
    setDetailsError(result.error)
    if (result.ok) setIsEditing(false)
    return result.ok
  }

  // The only "removal" path (roadmap 9.20) — never a hard DELETE. Leaves
  // mortgage_payments, mortgage_escrow_transactions, and any linked
  // documents untouched; the caller re-fetching afterward naturally forces
  // isEditing back on since there's no active mortgage anymore, same as a
  // brand-new property.
  const voidMortgage = async (): Promise<boolean> => {
    if (!mortgageDetails) return false
    setSaving(true)
    const { error: voidError } = await voidMortgageDetails(mortgageDetails.id)
    setSaving(false)

    if (voidError) {
      setDetailsError(`${friendlyDatabaseError(voidError)} The mortgage was not voided.`)
      return false
    }

    setDetailsError(null)
    return true
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
    detailsError,
    formInitialValues: mortgageDetails ?? BLANK_MORTGAGE,
    startEditing,
    cancelEditing,
    save,
    voidMortgage,
    equity,
    refresh,
  }
}
