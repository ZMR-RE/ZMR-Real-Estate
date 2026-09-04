import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listProperties } from '../properties/propertiesQueries'
import {
  createTransaction,
  listTransactions,
  updateTransaction,
  voidTransaction,
  type Transaction,
  type TransactionInput,
} from './financialsQueries'
import { buildTaxExportCsv, summarizeByProperty, summarizeByPropertyAndCategory } from './financialsCalculations'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

const BLANK_TRANSACTION: TransactionInput = {
  propertyId: '',
  entryType: 'expense',
  category: 'repairs',
  subcategory: null,
  vendorSource: '',
  unit: null,
  paymentMethod: '',
  repairOrImprovement: null,
  amount: 0,
  transactionDate: todayDateString(),
  description: null,
  statementReconciled: false,
}

function toInput(transaction: Transaction): TransactionInput {
  return {
    propertyId: transaction.property?.id ?? '',
    entryType: transaction.entry_type,
    category: transaction.category,
    subcategory: transaction.subcategory,
    vendorSource: transaction.vendor_source,
    unit: transaction.unit,
    paymentMethod: transaction.payment_method,
    repairOrImprovement: transaction.repair_or_improvement,
    amount: transaction.amount,
    transactionDate: transaction.transaction_date,
    description: transaction.description,
    statementReconciled: transaction.statement_reconciled,
  }
}

export function useFinancials() {
  const { accountId, session } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: p.name })))
    })
  }, [accountId])

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listTransactions(accountId, { propertyId: propertyFilter, year })
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setTransactions(data ?? [])
  }, [accountId, propertyFilter, year])

  useEffect(() => {
    refresh()
  }, [refresh])

  const selectedTransaction = transactions.find((t) => t.id === selectedId) ?? null

  const startCreating = () => {
    setSelectedId(null)
    setIsCreating(true)
  }

  const selectTransaction = (id: string) => {
    setIsCreating(false)
    setSelectedId(id)
  }

  const cancelForm = () => {
    setIsCreating(false)
    setSelectedId(null)
  }

  const save = async (input: TransactionInput) => {
    if (!accountId || !session) return
    setSaving(true)
    const { error: saveError } = selectedTransaction
      ? await updateTransaction(selectedTransaction.id, input)
      : await createTransaction(accountId, session.user.id, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setError(null)
    setIsCreating(false)
    setSelectedId(null)
    await refresh()
  }

  const voidEntry = async (id: string) => {
    const { error: voidError } = await voidTransaction(id)
    if (voidError) {
      setError(voidError.message)
      return
    }
    await refresh()
  }

  const exportTaxCsv = () => {
    const csv = buildTaxExportCsv(transactions, year)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `zmr-financials-${year}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return {
    transactions,
    propertyOptions,
    propertyFilter,
    setPropertyFilter,
    year,
    setYear,
    loading,
    error,
    isFormOpen: isCreating || selectedTransaction !== null,
    formKey: selectedTransaction?.id ?? 'new',
    formInitialValues: selectedTransaction ? toInput(selectedTransaction) : BLANK_TRANSACTION,
    saving,
    startCreating,
    selectTransaction,
    cancelForm,
    save,
    voidEntry,
    summaryByPropertyAndCategory: summarizeByPropertyAndCategory(transactions),
    summaryByProperty: summarizeByProperty(transactions),
    exportTaxCsv,
  }
}
