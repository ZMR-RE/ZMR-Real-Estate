import { useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listProperties } from '../properties/propertiesQueries'
import { useVendors } from '../vendors/useVendors'
import {
  bulkCreateTransactions,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type BulkTransactionInput,
  type Category,
  type EntryType,
  type RepairOrImprovement,
} from '../financials/financialsQueries'
import {
  cellValue,
  distinctValues,
  guessEntryType,
  guessMapping,
  parseAmount,
  parseCsv,
  parseDate,
  UNMAPPED_SENTINEL,
  type ColumnMapping,
  type FinancialsField,
  type ParsedCsv,
} from './csvParsing'

export type ImportStep = 'upload' | 'property' | 'mapping' | 'resolve' | 'preview' | 'importing' | 'done'

// A distinct raw category value, scoped to the entry type it appeared
// under — "Other" needs a different resolved category depending on
// whether the row it came from is Income or Expense.
function categoryResolutionKey(entryType: EntryType, rawValue: string): string {
  return `${entryType}::${rawValue}`
}

export type VendorResolution = { mode: 'existing'; vendorId: string } | { mode: 'create' } | { mode: 'none' }

interface PreviewRow {
  rowIndex: number
  valid: boolean
  error: string | null
  date: string | null
  amount: number | null
  entryType: EntryType | null
  category: Category | null
  subcategory: string | null
  vendorName: string | null
  paymentMethod: string
  description: string | null
  repairOrImprovement: RepairOrImprovement | null
}

export function useHistoricalImport() {
  const { accountId, session } = useAuth()
  const { vendorOptions, addVendor, refreshVendorOptions } = useVendors(accountId)

  const [step, setStep] = useState<ImportStep>('upload')
  const [fileName, setFileName] = useState('')
  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertyId, setPropertyId] = useState<string | null>(null)

  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('')

  const [entryTypeResolution, setEntryTypeResolution] = useState<Record<string, EntryType>>({})
  const [categoryResolution, setCategoryResolution] = useState<Record<string, Category>>({})
  const [vendorResolution, setVendorResolution] = useState<Record<string, VendorResolution>>({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ imported: number; skipped: number; newVendors: number } | null>(null)

  const loadProperties = () => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: propertyLabel(p) })))
    })
  }

  const uploadFile = async (file: File) => {
    setParseError(null)
    setFileName(file.name)
    const text = await file.text()
    const parsed = parseCsv(text)
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setParseError('Could not find any header row and data rows in this file.')
      return
    }
    setCsv(parsed)
    setMapping(guessMapping(parsed.headers))
    loadProperties()
    setStep('property')
  }

  const confirmProperty = () => {
    if (!propertyId) return
    setStep('mapping')
  }

  const setFieldMapping = (field: FinancialsField, columnIndex: number | null) => {
    setMapping((prev) => (prev ? { ...prev, [field]: columnIndex } : prev))
  }

  // Seeds every resolution table's default guess, so the resolve screen
  // opens with sensible pre-fills the user reviews/overrides rather than
  // blank dropdowns for every distinct value.
  const confirmMapping = () => {
    if (!csv || !mapping) return

    const entryTypeValues = distinctValues(csv.rows, mapping.entryType)
    const entryTypeSeed: Record<string, EntryType> = {}
    for (const raw of entryTypeValues) {
      entryTypeSeed[raw] = guessEntryType(raw) ?? 'expense'
    }
    setEntryTypeResolution(entryTypeSeed)

    const categorySeed: Record<string, Category> = {}
    for (const row of csv.rows) {
      const rawEntryType = cellValue(row, mapping.entryType)
      const resolvedEntryType = entryTypeSeed[rawEntryType] ?? 'expense'
      const rawCategory = cellValue(row, mapping.category)
      const key = categoryResolutionKey(resolvedEntryType, rawCategory)
      if (categorySeed[key]) continue
      const list = resolvedEntryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
      const match = list.find((c) => c.replace(/_/g, ' ') === rawCategory.toLowerCase())
      categorySeed[key] = match ?? (resolvedEntryType === 'income' ? 'other_income' : 'other_expense')
    }
    setCategoryResolution(categorySeed)

    const vendorValues = distinctValues(csv.rows, mapping.vendor)
    const vendorSeed: Record<string, VendorResolution> = {}
    for (const raw of vendorValues) {
      if (raw === UNMAPPED_SENTINEL || raw === '') {
        vendorSeed[raw] = { mode: 'none' }
        continue
      }
      const match = vendorOptions.find((v) => v.label.toLowerCase() === raw.toLowerCase())
      vendorSeed[raw] = match ? { mode: 'existing', vendorId: match.id } : { mode: 'create' }
    }
    setVendorResolution(vendorSeed)

    setStep('resolve')
  }

  const distinctEntryTypeValues = () => (csv && mapping ? distinctValues(csv.rows, mapping.entryType) : [])
  const distinctCategoryKeys = () => {
    if (!csv || !mapping) return []
    const keys = new Set<string>()
    for (const row of csv.rows) {
      const rawEntryType = cellValue(row, mapping.entryType)
      const resolvedEntryType = entryTypeResolution[rawEntryType] ?? 'expense'
      keys.add(categoryResolutionKey(resolvedEntryType, cellValue(row, mapping.category)))
    }
    return Array.from(keys).sort()
  }
  const distinctVendorValues = () => (csv && mapping ? distinctValues(csv.rows, mapping.vendor) : [])

  const buildPreviewRows = (): PreviewRow[] => {
    if (!csv || !mapping) return []
    return csv.rows.map((row, rowIndex) => {
      const rawDate = cellValue(row, mapping.date)
      const rawAmount = cellValue(row, mapping.amount)
      const date = mapping.date !== null ? parseDate(rawDate) : null
      const amount = mapping.amount !== null ? parseAmount(rawAmount) : null

      const rawEntryType = cellValue(row, mapping.entryType)
      const entryType = entryTypeResolution[rawEntryType] ?? null

      const rawCategory = cellValue(row, mapping.category)
      const category = entryType ? categoryResolution[categoryResolutionKey(entryType, rawCategory)] ?? null : null

      const rawVendor = cellValue(row, mapping.vendor)
      const vendorRes = vendorResolution[rawVendor]
      const vendorName =
        vendorRes?.mode === 'existing'
          ? (vendorOptions.find((v) => v.id === vendorRes.vendorId)?.label ?? null)
          : vendorRes?.mode === 'create'
            ? rawVendor
            : null

      const mappedPayment = mapping.paymentMethod !== null ? cellValue(row, mapping.paymentMethod) : ''
      const paymentMethod = mappedPayment.trim() || defaultPaymentMethod.trim()

      const rawRepair = mapping.repairOrImprovement !== null ? cellValue(row, mapping.repairOrImprovement) : ''
      let repairOrImprovement: RepairOrImprovement | null = null
      if (entryType === 'expense') {
        const v = rawRepair.trim().toLowerCase()
        if (v === 'repair') repairOrImprovement = 'repair'
        else if (v === 'improvement') repairOrImprovement = 'improvement'
      }

      const subcategory = mapping.subcategory !== null ? cellValue(row, mapping.subcategory) || null : null
      const description = mapping.description !== null ? cellValue(row, mapping.description) || null : null

      let rowError: string | null = null
      if (!date) rowError = `Row ${rowIndex + 2}: could not parse date "${rawDate}"`
      else if (amount === null) rowError = `Row ${rowIndex + 2}: could not parse amount "${rawAmount}"`
      else if (!entryType) rowError = `Row ${rowIndex + 2}: no Income/Expense resolution`
      else if (!category) rowError = `Row ${rowIndex + 2}: no category resolution`
      else if (!paymentMethod) rowError = `Row ${rowIndex + 2}: no payment method (set a default on the mapping step)`

      return {
        rowIndex,
        valid: rowError === null,
        error: rowError,
        date,
        amount,
        entryType,
        category,
        subcategory,
        vendorName,
        paymentMethod,
        description,
        repairOrImprovement,
      }
    })
  }

  const confirmResolution = () => setStep('preview')

  const runImport = async () => {
    if (!accountId || !session || !csv || !mapping || !propertyId) return
    setSaving(true)
    setError(null)

    const previewRows = buildPreviewRows()
    const validRows = previewRows.filter((r) => r.valid)
    const skipped = previewRows.length - validRows.length

    // Roadmap 9.9 precedent — vendors get created up front (not guessed
    // at import time), same "create-then-reference" order the Quick
    // Capture bridge uses. Each distinct "create" value only creates one
    // vendor regardless of how many rows share it.
    const newVendorIds: Record<string, string> = {}
    let newVendorCount = 0
    for (const [raw, res] of Object.entries(vendorResolution)) {
      if (res.mode !== 'create') continue
      const created = await addVendor({
        name: raw,
        contact_email: null,
        contact_phone: null,
        has_w9: false,
        has_insurance: false,
        relationship: null,
        vendor_type: null,
        notes: null,
      })
      if ('error' in created) {
        setSaving(false)
        setError(`Could not create vendor "${raw}": ${created.error}`)
        return
      }
      newVendorIds[raw] = created.id
      newVendorCount += 1
    }

    const inputs: BulkTransactionInput[] = []
    for (let i = 0; i < csv.rows.length; i++) {
      const row = csv.rows[i]
      const preview = previewRows[i]
      if (!preview.valid || !preview.date || preview.amount === null || !preview.entryType || !preview.category) {
        continue
      }
      const rawVendor = cellValue(row, mapping.vendor)
      const vendorRes = vendorResolution[rawVendor]
      const vendorId =
        vendorRes?.mode === 'existing'
          ? vendorRes.vendorId
          : vendorRes?.mode === 'create'
            ? (newVendorIds[rawVendor] ?? null)
            : null

      inputs.push({
        propertyId,
        entryType: preview.entryType,
        category: preview.category,
        subcategory: preview.subcategory,
        vendorId,
        unit: null,
        paymentMethod: preview.paymentMethod,
        repairOrImprovement: preview.repairOrImprovement,
        amount: preview.amount,
        transactionDate: preview.date,
        description: preview.description,
      })
    }

    const { error: insertError } = await bulkCreateTransactions(accountId, session.user.id, inputs)
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    if (newVendorCount > 0) refreshVendorOptions()
    setResult({ imported: inputs.length, skipped, newVendors: newVendorCount })
    setStep('done')
  }

  const reset = () => {
    setStep('upload')
    setFileName('')
    setCsv(null)
    setParseError(null)
    setPropertyId(null)
    setMapping(null)
    setDefaultPaymentMethod('')
    setEntryTypeResolution({})
    setCategoryResolution({})
    setVendorResolution({})
    setError(null)
    setResult(null)
  }

  return {
    step,
    fileName,
    csv,
    parseError,
    uploadFile,
    propertyOptions,
    propertyId,
    setPropertyId,
    confirmProperty,
    mapping,
    setFieldMapping,
    defaultPaymentMethod,
    setDefaultPaymentMethod,
    confirmMapping,
    distinctEntryTypeValues,
    entryTypeResolution,
    setEntryTypeResolution,
    distinctCategoryKeys,
    categoryResolution,
    setCategoryResolution,
    distinctVendorValues,
    vendorResolution,
    setVendorResolution,
    vendorOptions,
    confirmResolution,
    buildPreviewRows,
    saving,
    error,
    result,
    runImport,
    setStep,
    reset,
  }
}
