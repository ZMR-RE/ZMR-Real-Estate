import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listProperties } from '../properties/propertiesQueries'
import { useVendors } from '../vendors/useVendors'
import { listCaptureEntriesByTransactionIds } from '../capture/captureQueries'
import {
  createReimbursementTransaction,
  listTransactions,
  listVoidedTransactions,
  voidTransaction,
  type Transaction,
} from './financialsQueries'
import { getTransactionYearRange } from './financialYearsQueries'
import {
  buildTaxExportCsv,
  summarizeByProperty,
  summarizeByPropertyAndCategory,
  summarizeCapitalImprovementsByProperty,
} from './financialsCalculations'
import { buildYearOptions } from './transactionEntry'

// Financials' data side: the filtered transaction list, year choices,
// optional voided rows, summaries and exports. Entry/editing lives in
// useTransactionEntry.
export function useFinancials({ initialNeedsEntityOnly = false, initialYear }: { initialNeedsEntityOnly?: boolean; initialYear?: number } = {}) {
  const { accountId, session } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [voidedTransactions, setVoidedTransactions] = useState<Transaction[]>([])
  const [showVoided, setShowVoided] = useState(false)
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const { vendorOptions, addVendor } = useVendors(accountId)
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null)
  // Entity books: show only active transactions with no entity confirmed.
  const [needsEntityOnly, setNeedsEntityOnly] = useState(initialNeedsEntityOnly)
  const [year, setYear] = useState(initialYear ?? new Date().getFullYear())
  const [yearRange, setYearRange] = useState<{ earliest: number | null; latest: number | null }>({ earliest: null, latest: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Roadmap 9.9 — the transaction→capture half of the bridge's traceable
  // link. Same reverse-lookup shape as reimbursedSourceIds below: rather
  // than a mirrored column on financial_transactions, ask capture_log
  // which of the currently-loaded transaction ids it originated.
  const [capturedTransactionIds, setCapturedTransactionIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: propertyLabel(p) })))
    })
  }, [accountId])

  const refreshYears = useCallback(async () => {
    if (!accountId) return
    const { data } = await getTransactionYearRange(accountId)
    if (data) setYearRange(data)
  }, [accountId])

  useEffect(() => {
    refreshYears()
  }, [refreshYears])

  // `year` is included so a year the user just moved to (e.g. after
  // saving a 2018 entry) is always selectable even before the range
  // query comes back.
  const yearOptions = useMemo(() => buildYearOptions(yearRange, new Date().getFullYear(), [year]), [yearRange, year])

  // Only the most recently started load may update the list. Changing a
  // filter and refreshing in the same tick (e.g. after saving a 2018
  // entry while 2026 was shown) otherwise let a slower, stale response
  // for the old filter land last and overwrite the correct one.
  const loadSeq = useRef(0)

  const refresh = useCallback(async () => {
    if (!accountId) return
    const seq = ++loadSeq.current
    setLoading(true)
    const [active, voided] = await Promise.all([
      listTransactions(accountId, { propertyId: propertyFilter, year, needsEntity: needsEntityOnly }),
      showVoided ? listVoidedTransactions(accountId, { propertyId: propertyFilter, year }) : Promise.resolve(null),
    ])
    if (seq !== loadSeq.current) return
    setLoading(false)
    const fetchError = active.error ?? voided?.error
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setTransactions(active.data ?? [])
    setVoidedTransactions(voided?.data ?? [])
  }, [accountId, propertyFilter, year, showVoided, needsEntityOnly])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!accountId || transactions.length === 0) {
      setCapturedTransactionIds(new Set())
      return
    }
    listCaptureEntriesByTransactionIds(accountId, transactions.map((t) => t.id)).then(({ data }) => {
      setCapturedTransactionIds(new Set((data ?? []).map((link) => link.financial_transaction_id)))
    })
  }, [accountId, transactions])

  // M2 — after a confirmed save, move the filters so the saved row is
  // actually in the list: its year, and its property if a different
  // property was filtered. Returns what changed so the confirmation can
  // say so.
  const revealTransaction = (txYear: number, txPropertyId: string): string[] => {
    const changes: string[] = []
    if (txYear !== year) {
      setYear(txYear)
      changes.push(`showing ${txYear}`)
    }
    if (propertyFilter && propertyFilter !== txPropertyId) {
      setPropertyFilter(txPropertyId)
      changes.push('filtered to its property')
    }
    return changes
  }

  // Returns an error message for the caller to show next to the row
  // (e.g. a locked-period rejection), or null on success.
  const voidEntry = async (id: string): Promise<string | null> => {
    const { error: voidError } = await voidTransaction(id)
    if (voidError) return voidError.message
    await Promise.all([refresh(), refreshYears()])
    return null
  }

  // The set of transactions in the currently loaded list is a source of
  // an already-applied split — used to hide "Apply saved split" once it's
  // been clicked, so it can't be applied twice to the same transaction.
  const reimbursedSourceIds = new Set(
    transactions.filter((t) => t.reimbursement_source_id).map((t) => t.reimbursement_source_id as string),
  )

  // The explicit, one-click Split Rule action (roadmap 8.8) — never
  // triggered any other way, per the Bookkeeping rule. Computes the
  // reimbursement off the vendor's saved percentage and inserts a
  // separate income transaction linked back to this one; never edits the
  // original expense.
  const applySplit = async (transaction: Transaction) => {
    if (!accountId || !session || !transaction.property || !transaction.vendor?.split_percentage) return
    const pct = transaction.vendor.split_percentage
    const amount = Math.round(transaction.amount * (pct / 100) * 100) / 100
    if (!(amount > 0)) return

    setSaving(true)
    const { error: saveError } = await createReimbursementTransaction(accountId, session.user.id, {
      propertyId: transaction.property.id,
      vendorId: transaction.vendor.id,
      unit: transaction.unit,
      paymentMethod: transaction.payment_method,
      amount,
      transactionDate: transaction.transaction_date,
      description: `Reimbursement (${pct}%) for ${transaction.vendor.name}${
        transaction.description ? ` — ${transaction.description}` : ''
      }`,
      reimbursementSourceId: transaction.id,
    })
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  // Only non-voided rows are exported — `transactions` never contains
  // voided rows (listTransactions), and "Show voided" rows live in
  // voidedTransactions, which no export reads.
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
    voidedTransactions,
    showVoided,
    setShowVoided,
    propertyOptions,
    vendorOptions,
    createVendor: addVendor,
    // Roadmap 2.4a — HistoricalImportWizard writes transactions directly
    // via financialsQueries.bulkCreateTransactions, bypassing this
    // hook's own save/create paths entirely (a bulk multi-row insert
    // has no use for per-row form state) — it calls this afterward so
    // Financials' own list picks up the newly-imported rows.
    refreshTransactions: refresh,
    refreshYears,
    revealTransaction,
    propertyFilter,
    setPropertyFilter,
    needsEntityOnly,
    setNeedsEntityOnly,
    year,
    setYear,
    yearOptions,
    loading,
    error,
    saving,
    voidEntry,
    applySplit,
    reimbursedSourceIds,
    capturedTransactionIds,
    summaryByPropertyAndCategory: summarizeByPropertyAndCategory(transactions),
    summaryByProperty: summarizeByProperty(transactions),
    capitalImprovements: summarizeCapitalImprovementsByProperty(transactions),
    exportTaxCsv,
  }
}
