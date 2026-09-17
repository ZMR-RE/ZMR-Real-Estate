import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createMortgageEscrowTransaction,
  listMortgageEscrowTransactions,
  voidMortgageEscrowTransaction,
  type MortgageEscrowTransaction,
  type MortgageEscrowTransactionInput,
} from './mortgagePayoffQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

const BLANK_ESCROW_TRANSACTION: MortgageEscrowTransactionInput = {
  transaction_date: todayDateString(),
  transaction_type: 'deposit',
  amount: '',
  description: null,
}

// The mortgage_escrow_transactions ledger (roadmap 9.14) + its void path
// (9.20) — split out of useMortgageForProperty.ts (audit: file size
// discipline). Logging/voiding a transaction also moves
// mortgage_details.escrow_balance via a DB trigger; useMortgageForProperty.ts
// (the composition hook) is responsible for re-fetching mortgage details
// afterward, not this hook.
export function useMortgageEscrow(propertyId: string) {
  const { accountId } = useAuth()

  const [escrowTransactions, setEscrowTransactions] = useState<MortgageEscrowTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingEscrowTransaction, setLoggingEscrowTransaction] = useState(false)
  const [escrowTransactionError, setEscrowTransactionError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchError } = await listMortgageEscrowTransactions(propertyId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setError(null)
    setEscrowTransactions(data ?? [])
  }, [propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // The trigger on mortgage_escrow_transactions already applied the
  // deposit/disbursement to escrow_balance by the time this resolves — the
  // composition hook re-reads it via useMortgageDetails.refresh() rather
  // than computing the new balance client-side, same reasoning as
  // logPayment in useMortgagePayments.
  const logEscrowTransaction = async (input: MortgageEscrowTransactionInput): Promise<boolean> => {
    if (!accountId) return false

    setLoggingEscrowTransaction(true)
    const { error: escrowSaveError } = await createMortgageEscrowTransaction(accountId, propertyId, input)
    setLoggingEscrowTransaction(false)

    if (escrowSaveError) {
      setEscrowTransactionError(escrowSaveError.message)
      return false
    }

    setEscrowTransactionError(null)
    return true
  }

  // The only "removal" path for an escrow transaction (roadmap 9.20) —
  // never a hard DELETE. Note this doesn't reverse the deposit/disbursement
  // already applied to escrow_balance (see voidMortgageEscrowTransaction);
  // it corrects the record, not the balance.
  const voidEscrowTransaction = async (id: string): Promise<boolean> => {
    setLoggingEscrowTransaction(true)
    const { error: voidError } = await voidMortgageEscrowTransaction(id)
    setLoggingEscrowTransaction(false)

    if (voidError) {
      setEscrowTransactionError(voidError.message)
      return false
    }

    setEscrowTransactionError(null)
    return true
  }

  return {
    escrowTransactions,
    loading,
    error,
    loggingEscrowTransaction,
    escrowTransactionError,
    escrowTransactionFormInitialValues: BLANK_ESCROW_TRANSACTION,
    logEscrowTransaction,
    voidEscrowTransaction,
    refresh,
  }
}
