import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createMortgageDetails,
  getMortgageDetails,
  updateMortgageDetails,
  voidMortgageDetails,
  type MortgageDetails,
  type MortgageDetailsInput,
} from './mortgagePayoffQueries'
import { computeEquity, type EquitySnapshot } from './mortgagePayoffMath'

const BLANK_MORTGAGE: MortgageDetailsInput = {
  lender_name: null,
  original_loan_amount: '',
  current_balance: '',
  interest_rate: '',
  monthly_payment: '',
  loan_start_date: '',
  term_years: 30,
  escrow_balance: null,
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
  const [error, setError] = useState<string | null>(null)

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

  const save = async (input: MortgageDetailsInput): Promise<boolean> => {
    if (!accountId) return false

    setSaving(true)
    const { data, error: saveError } = mortgageDetails
      ? await updateMortgageDetails(mortgageDetails.id, input)
      : await createMortgageDetails(accountId, propertyId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return false
    }

    setError(null)
    setMortgageDetails(data)
    setIsEditing(false)
    return true
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
      setError(voidError.message)
      return false
    }

    setError(null)
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
    formInitialValues: mortgageDetails ?? BLANK_MORTGAGE,
    startEditing,
    cancelEditing,
    save,
    voidMortgage,
    equity,
    refresh,
  }
}
