import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listProperties } from '../properties/propertiesQueries'
import { listTransactions, type Transaction } from '../financials/financialsQueries'
import { markTransactionsReconciled } from './bankReconciliationQueries'
import { computeReconciliation, filterByPeriod } from './bankReconciliationCalculations'

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
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: propertyLabel(p) })))
    })
  }, [accountId])

  const refresh = useCallback(async () => {
    if (!accountId || !propertyId) {
      setTransactions([])
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await listTransactions(accountId, { propertyId })
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    const inPeriod = filterByPeriod(data ?? [], periodStart, periodEnd)
    setTransactions(inPeriod)
    setSelectedIds(new Set(inPeriod.filter((tx) => tx.statement_reconciled).map((tx) => tx.id)))
  }, [accountId, propertyId, periodStart, periodEnd])

  useEffect(() => {
    refresh()
  }, [refresh])

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
    setSaving(true)
    const { error: saveError } = await markTransactionsReconciled(accountId, unreconciledSelectedIds)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
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
    error,
    saving,
    result,
    hasEnteredBalances,
    canMarkReconciled: hasEnteredBalances && result.isBalanced && unreconciledSelectedIds.length > 0,
    markReconciled,
  }
}
