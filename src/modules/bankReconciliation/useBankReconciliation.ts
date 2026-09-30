import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listProperties } from '../properties/propertiesQueries'
import { listTransactions, type Transaction } from '../financials/financialsQueries'
import { listReconciliationState, markTransactionsReconciled } from './bankReconciliationQueries'
import { computeReconciliation, filterByPeriod } from './bankReconciliationCalculations'
import {
  createSelectionGate,
  INITIAL_RECONCILIATION_STATUS,
  loadLatest,
  reconciliationStatusReducer,
  reloadEvent,
  saveThenReload,
  type ListSelection,
  type ReloadOutcome,
  type VerifyOutcome,
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
  const [loadGate] = useState(createSelectionGate)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: propertyLabel(p) })))
    })
  }, [accountId])

  const selection = useMemo<ListSelection>(
    () => ({ propertyId, periodStart, periodEnd }),
    [propertyId, periodStart, periodEnd],
  )

  // Loads the list for one selection and reports the outcome; it never
  // touches the messages itself. Its result populates the list only if it
  // is for the selection the owner has NOW and no newer load for that
  // selection started (see createSelectionGate).
  const loadFor = useCallback(
    async (sel: ListSelection): Promise<ReloadOutcome> => {
      if (!accountId || !sel.propertyId) {
        loadGate.begin(sel)
        setTransactions([])
        return { status: 'loaded', reconciledIds: [] }
      }
      const propertyForLoad = sel.propertyId
      setLoading(true)
      const outcome = await loadLatest(
        loadGate,
        sel,
        async () => {
          const { data, error } = await listTransactions(accountId, { propertyId: propertyForLoad })
          return { data, error: error?.message ?? null }
        },
        (data) => {
          const inPeriod = filterByPeriod(data ?? [], sel.periodStart, sel.periodEnd)
          setTransactions(inPeriod)
          setSelectedIds(new Set(inPeriod.filter((tx) => tx.statement_reconciled).map((tx) => tx.id)))
          return inPeriod.filter((tx) => tx.statement_reconciled).map((tx) => tx.id)
        },
      )
      if (outcome.status !== 'superseded') setLoading(false)
      return outcome
    },
    [accountId, loadGate],
  )

  // Selection change: record it as current, then load it. Records only its
  // own outcome, so an unacknowledged save result stays on screen.
  useEffect(() => {
    loadGate.select(selection)
    loadFor(selection).then((outcome) => {
      const event = reloadEvent(outcome)
      if (event) dispatch(event)
    })
  }, [selection, loadFor, loadGate])

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
      // Verify the saved records themselves, whatever is on screen now.
      async (): Promise<VerifyOutcome> => {
        const { data, error } = await listReconciliationState(accountId, requested)
        if (error) return { status: 'failed', error: error.message }
        return {
          status: 'checked',
          reconciledIds: (data ?? []).filter((r) => r.statement_reconciled && !r.voided).map((r) => r.id as string),
        }
      },
      // Reload whatever the owner has selected NOW (not the saved selection).
      () => {
        const current = loadGate.current()
        return current ? loadFor(current) : Promise.resolve<ReloadOutcome>({ status: 'superseded' })
      },
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
