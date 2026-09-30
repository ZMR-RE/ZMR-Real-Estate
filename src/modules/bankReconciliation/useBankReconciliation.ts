import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listProperties } from '../properties/propertiesQueries'
import { listTransactions, type Transaction } from '../financials/financialsQueries'
import { markTransactionsReconciled } from './bankReconciliationQueries'
import { computeReconciliation, filterByPeriod } from './bankReconciliationCalculations'
import {
  INITIAL_RECONCILIATION_STATUS,
  reconciliationStatusReducer,
  reloadEvent,
  saveThenReload,
  type ReloadOutcome,
} from './bankReconciliationStatus'

function firstOfMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useBankReconciliation() {
  const { accountId } = useAuth()
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [periodStart, setPeriodStart] = useState(firstOfMonth())
  const [periodEnd, setPeriodEnd] = useState(todayDateString())
  const [startingBalance, setStartingBalance] = useState('')
  const [endingBalance, setEndingBalance] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [status, dispatch] = useReducer(reconciliationStatusReducer, INITIAL_RECONCILIATION_STATUS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: propertyLabel(p) })))
    })
  }, [accountId])

  // Loads the list and reports whether that worked; it never touches the
  // messages itself (see bankReconciliationStatus.ts).
  const loadList = useCallback(async (): Promise<ReloadOutcome> => {
    if (!accountId || !propertyId) {
      setTransactions([])
      return { error: null }
    }
    setLoading(true)
    const { data, error: fetchError } = await listTransactions(accountId, { propertyId })
    setLoading(false)
    if (fetchError) return { error: fetchError.message }
    const inPeriod = filterByPeriod(data ?? [], periodStart, periodEnd)
    setTransactions(inPeriod)
    setSelectedIds(new Set(inPeriod.filter((tx) => tx.statement_reconciled).map((tx) => tx.id)))
    return { error: null }
  }, [accountId, propertyId, periodStart, periodEnd])

  // Filter-triggered reload: records its own outcome only, so an
  // unacknowledged save result stays on screen.
  useEffect(() => {
    loadList().then((outcome) => dispatch(reloadEvent(outcome)))
  }, [loadList])

  const toggleTransaction = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const clearedTransactions = useMemo(
    () => transactions.filter((tx) => selectedIds.has(tx.id)),
    [transactions, selectedIds],
  )

  const result = useMemo(
    () => computeReconciliation(Number(startingBalance) || 0, clearedTransactions, Number(endingBalance) || 0),
    [startingBalance, clearedTransactions, endingBalance],
  )

  const hasEnteredBalances = startingBalance.trim() !== '' && endingBalance.trim() !== ''

  const unreconciledSelectedIds = useMemo(
    () =>
      Array.from(selectedIds).filter((id) => {
        const tx = transactions.find((t) => t.id === id)
        return tx && !tx.statement_reconciled
      }),
    [selectedIds, transactions],
  )

  const markReconciled = async () => {
    if (!accountId || unreconciledSelectedIds.length === 0) return
    const requested = unreconciledSelectedIds
    setSaving(true)
    await saveThenReload(
      requested,
      async () => {
        const { data, error: saveError } = await markTransactionsReconciled(accountId, requested)
        setSaving(false)
        return { updatedIds: saveError ? null : (data ?? []).map((r) => r.id as string), error: saveError?.message ?? null }
      },
      loadList,
      dispatch,
    )
  }

  return {
    propertyOptions,
    propertyId,
    setPropertyId,
    periodStart,
    setPeriodStart,
    periodEnd,
    setPeriodEnd,
    startingBalance,
    setStartingBalance,
    endingBalance,
    setEndingBalance,
    transactions,
    selectedIds,
    toggleTransaction,
    loading,
    error: status.error,
    saveNotice: status.saveNotice,
    listStale: status.listStale,
    dismissSaveNotice: () => dispatch({ type: 'noticeDismissed' }),
    saving,
    result,
    hasEnteredBalances,
    canMarkReconciled: hasEnteredBalances && result.isBalanced && unreconciledSelectedIds.length > 0,
    markReconciled,
  }
}
