import { propertyLabel } from '../../shared/propertyLabel'
import { CATEGORY_LABELS, type Category, type EntryType, type Transaction } from './financialsQueries'

// M5 — the one definition of how a saved transaction counts, shared by
// Financials' summaries, the tax CSV and the Reports (P&L, Cash Flow).
//
//   income             — every non-voided income row.
//   operating_expense  — expense rows that belong on Schedule-E-style
//                        expense lines and in profit/loss.
//   capital_improvement — expense rows flagged "Improvement". Real money
//                        spent, but capital: kept out of ordinary expense
//                        lines and profit (they feed cost basis /
//                        depreciation separately), and shown once as its
//                        own spending line wherever cash is reported.
//
// Voided rows count nowhere. This is a presentation/calculation rule
// only — it never changes a saved row's category, date or flag, and it
// makes no deductibility determination.
export type LedgerTreatment = 'income' | 'operating_expense' | 'capital_improvement'

export function ledgerTreatment(tx: Pick<Transaction, 'entry_type' | 'repair_or_improvement'>): LedgerTreatment {
  if (tx.entry_type === 'income') return 'income'
  return tx.repair_or_improvement === 'improvement' ? 'capital_improvement' : 'operating_expense'
}

export const TREATMENT_LABELS: Record<LedgerTreatment, string> = {
  income: 'Income',
  operating_expense: 'Operating expense',
  capital_improvement: 'Capital improvement',
}

function countable(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => !tx.voided)
}

// Sums in whole cents so totals never drift (0.1 + 0.2 style) before
// being shown or exported.
function toCents(amount: number): number {
  return Math.round(Number(amount) * 100)
}
function fromCents(cents: number): number {
  return cents / 100
}

export interface LedgerTotals {
  income: number
  operatingExpense: number
  capitalImprovements: number
  // income − operating expense: the profit figure (matches P&L net).
  netOperating: number
  // income − operating expense − capital improvements: every dollar in
  // and out of these transactions, before mortgage principal.
  netAfterAllSpending: number
}

export function computeLedgerTotals(transactions: Transaction[]): LedgerTotals {
  let income = 0
  let operating = 0
  let capital = 0
  for (const tx of countable(transactions)) {
    const cents = toCents(tx.amount)
    const treatment = ledgerTreatment(tx)
    if (treatment === 'income') income += cents
    else if (treatment === 'operating_expense') operating += cents
    else capital += cents
  }
  return {
    income: fromCents(income),
    operatingExpense: fromCents(operating),
    capitalImprovements: fromCents(capital),
    netOperating: fromCents(income - operating),
    netAfterAllSpending: fromCents(income - operating - capital),
  }
}

// Schedule-E-style line totals by category: income and operating
// expenses only. Improvements are excluded here, not re-categorized.
export function totalsByScheduleECategory(transactions: Transaction[]): Map<Category, number> {
  const cents = new Map<Category, number>()
  for (const tx of countable(transactions)) {
    if (ledgerTreatment(tx) === 'capital_improvement') continue
    cents.set(tx.category, (cents.get(tx.category) ?? 0) + toCents(tx.amount))
  }
  return new Map([...cents].map(([category, value]) => [category, fromCents(value)]))
}

export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface SummaryRow {
  propertyId: string
  propertyName: string
  entryType: EntryType
  category: Category
  categoryLabel: string
  total: number
}

export interface PropertyTotals extends LedgerTotals {
  propertyId: string
  propertyName: string
}

function groupByProperty(transactions: Transaction[]): Map<string, { name: string; rows: Transaction[] }> {
  const groups = new Map<string, { name: string; rows: Transaction[] }>()
  for (const tx of countable(transactions)) {
    if (!tx.property) continue
    const group = groups.get(tx.property.id) ?? { name: propertyLabel(tx.property), rows: [] }
    group.rows.push(tx)
    groups.set(tx.property.id, group)
  }
  return groups
}

// Schedule-E-style lines per property — income and operating expenses
// only. Capital improvements are reported separately
// (summarizeCapitalImprovementsByProperty), never folded into Repairs or
// any other expense line.
export function summarizeByPropertyAndCategory(transactions: Transaction[]): SummaryRow[] {
  const rows: SummaryRow[] = []
  for (const [propertyId, group] of groupByProperty(transactions)) {
    for (const [category, total] of totalsByScheduleECategory(group.rows)) {
      const sample = group.rows.find((tx) => tx.category === category && ledgerTreatment(tx) !== 'capital_improvement')!
      rows.push({
        propertyId,
        propertyName: group.name,
        entryType: sample.entry_type,
        category,
        categoryLabel: CATEGORY_LABELS[category],
        total,
      })
    }
  }
  return rows.sort((a, b) => {
    if (a.propertyName !== b.propertyName) return a.propertyName.localeCompare(b.propertyName)
    if (a.entryType !== b.entryType) return a.entryType === 'income' ? -1 : 1
    return a.categoryLabel.localeCompare(b.categoryLabel)
  })
}

export interface CapitalImprovementRow {
  propertyId: string
  propertyName: string
  total: number
  count: number
}

export function summarizeCapitalImprovementsByProperty(transactions: Transaction[]): CapitalImprovementRow[] {
  const rows: CapitalImprovementRow[] = []
  for (const [propertyId, group] of groupByProperty(transactions)) {
    const improvements = group.rows.filter((tx) => ledgerTreatment(tx) === 'capital_improvement')
    if (improvements.length === 0) continue
    rows.push({
      propertyId,
      propertyName: group.name,
      total: computeLedgerTotals(improvements).capitalImprovements,
      count: improvements.length,
    })
  }
  return rows.sort((a, b) => a.propertyName.localeCompare(b.propertyName))
}

export function summarizeByProperty(transactions: Transaction[]): PropertyTotals[] {
  return [...groupByProperty(transactions)]
    .map(([propertyId, group]) => ({ propertyId, propertyName: group.name, ...computeLedgerTotals(group.rows) }))
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName))
}

// Payer/payee as shown to the user: vendor, tenant or prospective tenant
// (at most one is ever set — financial_transactions_payer_single_entity).
export function payerName(tx: Pick<Transaction, 'vendor' | 'tenant' | 'prospective_tenant'>): string {
  return tx.vendor?.name ?? tx.tenant?.name ?? tx.prospective_tenant?.name ?? ''
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
// Voided rows are never exported. Every countable row appears in the
// detail with its treatment; the Schedule-E summary excludes capital
// improvements, which get their own clearly labeled section.
export function buildTaxExportCsv(transactions: Transaction[], year: number): string {
  const rows = countable(transactions)
  const detailHeader = ['Property', 'Type', 'Category', 'Treatment', 'Date', 'Amount', 'Payer/payee', 'Payment method', 'Description']
  const detailRows = rows.map((tx) => [
    propertyLabel(tx.property),
    tx.entry_type === 'income' ? 'Income' : 'Expense',
    CATEGORY_LABELS[tx.category],
    TREATMENT_LABELS[ledgerTreatment(tx)],
    tx.transaction_date,
    Number(tx.amount).toFixed(2),
    payerName(tx),
    tx.payment_method,
    tx.description ?? '',
  ])

  const summaryHeader = ['Property', 'Type', 'Category', 'Total']
  const summaryRows = summarizeByPropertyAndCategory(rows).map((row) => [
    row.propertyName,
    row.entryType === 'income' ? 'Income' : 'Expense',
    row.categoryLabel,
    row.total.toFixed(2),
  ])

  const improvementRows = summarizeCapitalImprovementsByProperty(rows).map((row) => [
    row.propertyName,
    String(row.count),
    row.total.toFixed(2),
  ])

  const sections = [
    toCsvLines([[`ZMR Real Estate — ${year} tax export`], [], detailHeader, ...detailRows]),
    '',
    toCsvLines([['Summary by property and category (income and operating expenses)'], summaryHeader, ...summaryRows]),
  ]
  if (improvementRows.length > 0) {
    sections.push(
      '',
      toCsvLines([
        ['Capital improvements (not included in the expense lines above)'],
        ['Property', 'Transactions', 'Total'],
        ...improvementRows,
      ]),
    )
  }
  return sections.join('\n')
}
