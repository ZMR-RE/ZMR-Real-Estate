import { CATEGORY_LABELS, type Category, type EntryType, type Transaction } from './financialsQueries'

export interface SummaryRow {
  propertyId: string
  propertyName: string
  entryType: EntryType
  category: Category
  categoryLabel: string
  total: number
}

export interface PropertyTotals {
  propertyId: string
  propertyName: string
  totalIncome: number
  totalExpense: number
  netIncome: number
}

export function summarizeByPropertyAndCategory(transactions: Transaction[]): SummaryRow[] {
  const totals = new Map<string, SummaryRow>()

  for (const tx of transactions) {
    if (!tx.property) continue
    const key = `${tx.property.id}:${tx.category}`
    const existing = totals.get(key)
    if (existing) {
      existing.total += tx.amount
      continue
    }
    totals.set(key, {
      propertyId: tx.property.id,
      propertyName: tx.property.name,
      entryType: tx.entry_type,
      category: tx.category,
      categoryLabel: CATEGORY_LABELS[tx.category],
      total: tx.amount,
    })
  }

  return Array.from(totals.values()).sort((a, b) => {
    if (a.propertyName !== b.propertyName) return a.propertyName.localeCompare(b.propertyName)
    if (a.entryType !== b.entryType) return a.entryType === 'income' ? -1 : 1
    return a.categoryLabel.localeCompare(b.categoryLabel)
  })
}

export function summarizeByProperty(transactions: Transaction[]): PropertyTotals[] {
  const totals = new Map<string, PropertyTotals>()

  for (const tx of transactions) {
    if (!tx.property) continue
    const existing = totals.get(tx.property.id) ?? {
      propertyId: tx.property.id,
      propertyName: tx.property.name,
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
    }
    if (tx.entry_type === 'income') {
      existing.totalIncome += tx.amount
    } else {
      existing.totalExpense += tx.amount
    }
    existing.netIncome = existing.totalIncome - existing.totalExpense
    totals.set(tx.property.id, existing)
  }

  return Array.from(totals.values()).sort((a, b) => a.propertyName.localeCompare(b.propertyName))
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsvLines(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n')
}

// transactions is expected to already be scoped to the tax year being
// exported (the caller filters via listTransactions's year filter).
export function buildTaxExportCsv(transactions: Transaction[], year: number): string {
  const detailHeader = ['Property', 'Type', 'Category', 'Date', 'Amount', 'Description']
  const detailRows = transactions.map((tx) => [
    tx.property?.name ?? '',
    tx.entry_type === 'income' ? 'Income' : 'Expense',
    CATEGORY_LABELS[tx.category],
    tx.transaction_date,
    tx.amount.toFixed(2),
    tx.description ?? '',
  ])

  const summaryHeader = ['Property', 'Type', 'Category', 'Total']
  const summaryRows = summarizeByPropertyAndCategory(transactions).map((row) => [
    row.propertyName,
    row.entryType === 'income' ? 'Income' : 'Expense',
    row.categoryLabel,
    row.total.toFixed(2),
  ])

  return [
    toCsvLines([[`ZMR Real Estate — ${year} tax export`], [], detailHeader, ...detailRows]),
    '',
    toCsvLines([['Summary by property and category'], summaryHeader, ...summaryRows]),
  ].join('\n')
}
