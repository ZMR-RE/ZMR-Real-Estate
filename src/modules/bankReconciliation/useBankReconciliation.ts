import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listProperties } from '../properties/propertiesQueries'
import { listTransactions, type Transaction } from '../financials/financialsQueries'
import { markTransactionsReconciled } from './bankReconciliationQueries'
import { computeReconciliation, filterByPeriod } from './bankReconciliationCalculations'
import {
  createLatestLoadGate,
  INITIAL_RECONCILIATION_STATUS,
  loadLatest,
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
  const [loadGate] = useState(createLatestLoadGate)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: propertyLabel(p) })))
    })
  }, [accountId])

  // Loads the list for the current property/period and reports the
  // outcome; it never touches the messages itself. A response that arrives
  // after a newer load started (the owner changed the selection) is
  // ignored, so it cannot replace the current selection's list.
  const loadList = useCallback(async (): Promise<ReloadOutcome> => {
    if (!accountId || !propertyId) {
      loadGate.begin()
      setTransactions([])
      return { status: 'loaded', reconciledIds: [] }
    }
    setLoading(true)
    const outcome = await loadLatest(
      loadGate,
      async () => {
        const { data, error } = await listTransactions(accountId, { propertyId })
        return { data, error: error?.message ?? null }
      },
      (data) => {
        const inPeriod = filterByPeriod(data ?? [], periodStart, periodEnd)
        setTransactions(inPeriod)
        setSelectedIds(new Set(inPeriod.filter((tx) => tx.statement_reconciled).map((tx) => tx.id)))
        return inPeriod.filter((tx) => tx.statement_reconciled).map((tx) => tx.id)
      },
    )
    if (outcome.status !== 'superseded') setLoading(false)
    return outcome
  }, [accountId, propertyId, periodStart, periodEnd, loadGate])

  // Filter-triggered reload: records its own outcome only, so an
  // unacknowledged save result stays on screen.
  useEffect(() => {
    loadList().then((outcome) => {
      const event = reloadEvent(outcome)
      if (event) dispatch(event)
    })
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
        const { data, error: saveError, status } = await markTransactionsReconciled(accountId, requested)
        setSaving(false)
        return {
          updatedIds: saveError ? null : (data ?? []).map((r) => r.id as string),
          error: saveError ? { message: saveError.message, code: saveError.code, status } : null,
        }
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
