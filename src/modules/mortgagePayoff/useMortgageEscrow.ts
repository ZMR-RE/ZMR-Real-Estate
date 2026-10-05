import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createMortgageEscrowTransaction,
  listMortgageEscrowTransactions,
  voidMortgageActivity,
  type MortgageEscrowTransaction,
  type MortgageEscrowTransactionInput,
} from './mortgagePayoffQueries'
import { friendlyDatabaseError, voidRefusalMessage } from './mortgageBalanceIntegrity'
import { createHistoryEscrow, listHistoryEscrow, voidHistoryEntry } from './mortgageHistoryQueries'
import { saveMortgageEntry } from './mortgageHistoryEntry'

// One list row: a normal escrow entry, or a history-only item already included in the opening escrow balance (option B).
export type EscrowRow = MortgageEscrowTransaction & { history: boolean }

export interface PendingEscrowDuplicate {
  input: MortgageEscrowTransactionInput
  historyOnly: boolean
  total: number
  message: string
}

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

  const [escrowTransactions, setEscrowTransactions] = useState<EscrowRow[]>([])
  const [duplicate, setDuplicate] = useState<PendingEscrowDuplicate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingEscrowTransaction, setLoggingEscrowTransaction] = useState(false)
  const [escrowTransactionError, setEscrowTransactionError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [{ data, error: fetchError }, { data: history, error: historyError }] = await Promise.all([
      listMortgageEscrowTransactions(propertyId),
      listHistoryEscrow(propertyId),
    ])
    setLoading(false)

    if (fetchError || historyError) {
      setError((fetchError ?? historyError)!.message)
      return
    }

    setError(null)
    const rows: EscrowRow[] = [
      ...(data ?? []).map((t) => ({ ...t, history: false })),
      ...(history ?? []).map((h) => ({ ...h, void_outcome: null, history: true })),
    ]
    rows.sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : a.transaction_date > b.transaction_date ? -1 : 0))
    setEscrowTransactions(rows)
  }, [propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // The trigger on mortgage_escrow_transactions already applied the
  // deposit/disbursement to escrow_balance by the time this resolves — the
  // composition hook re-reads it via useMortgageDetails.refresh() rather
  // than computing the new balance client-side, same reasoning as
  // logPayment in useMortgagePayments.
  const attempt = async (input: MortgageEscrowTransactionInput, historyOnly: boolean, ack: number | null): Promise<boolean> => {
    if (!accountId) return false
    setLoggingEscrowTransaction(true)
    const outcome = await saveMortgageEntry(
      (a) => (historyOnly ? createHistoryEscrow(accountId, propertyId, input, a) : createMortgageEscrowTransaction(accountId, propertyId, input, a)),
      input.transaction_date,
      ack,
    )
    setLoggingEscrowTransaction(false)
    if (outcome.kind === 'duplicate') {
      setEscrowTransactionError(null)
      setDuplicate({ input, historyOnly, total: outcome.counts.total, message: outcome.message })
      return false
    }
    setDuplicate(null)
    setEscrowTransactionError(outcome.kind === 'error' ? outcome.message : null)
    return outcome.kind === 'saved'
  }

  const logEscrowTransaction = (input: MortgageEscrowTransactionInput, historyOnly = false) => attempt(input, historyOnly, null)
  const confirmDuplicate = () => (duplicate ? attempt(duplicate.input, duplicate.historyOnly, duplicate.total) : Promise.resolve(false))
  const dismissDuplicate = () => setDuplicate(null)

  // The only "removal" path (roadmap 9.20) — never a hard DELETE. The database reverses the entry's balance effect
  // exactly once when that is safe; otherwise it voids without adjusting (the row shows why), or refuses and opens an
  // Action Queue balance review (balance integrity, 20261004100000).
  const voidEscrowTransaction = async (id: string): Promise<boolean> => {
    if (escrowTransactions.find((t) => t.id === id)?.history) {
      setLoggingEscrowTransaction(true)
      const { error: historyVoidError } = await voidHistoryEntry('escrow', id)
      setLoggingEscrowTransaction(false)
      setEscrowTransactionError(historyVoidError ? friendlyDatabaseError(historyVoidError) : null)
      return !historyVoidError
    }
    setLoggingEscrowTransaction(true)
    const { data: result, error: voidError } = await voidMortgageActivity('escrow', id)
    setLoggingEscrowTransaction(false)

    if (voidError) {
      setEscrowTransactionError(friendlyDatabaseError(voidError))
      return false
    }
    // A refused void leaves the entry active; the database already opened the Action Queue balance review.
    const refusal = voidRefusalMessage(result?.outcome ?? null)
    if (refusal) {
      setEscrowTransactionError(refusal)
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
    escrowDuplicate: duplicate,
    confirmEscrowDuplicate: confirmDuplicate,
    dismissEscrowDuplicate: dismissDuplicate,
    beginEscrowEntry: () => { setEscrowTransactionError(null); setDuplicate(null) },
    escrowTransactionFormInitialValues: BLANK_ESCROW_TRANSACTION,
    logEscrowTransaction,
    voidEscrowTransaction,
    refresh,
  }
}
