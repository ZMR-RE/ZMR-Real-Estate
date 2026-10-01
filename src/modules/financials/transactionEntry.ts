import { formatDateOnly, todayLocalIsoDate } from '../../shared/dateFormat'
import { CATEGORY_LABELS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Transaction, type TransactionInput } from './financialsQueries'
import type { TenantPayerOption } from './transactionPayerQueries'
import { formatMoney } from './financialsCalculations'

// Pure rules for the manual transaction entry flow (M2–M4), separate
// from the React form so they can be tested directly.

export function blankTransaction(today: string = todayLocalIsoDate()): TransactionInput {
  return {
    propertyId: '',
    entryType: 'expense',
    category: 'repairs',
    subcategory: null,
    payer: { kind: 'none' },
    unit: null,
    paymentMethod: '',
    repairOrImprovement: null,
    amount: 0,
    transactionDate: today,
    description: null,
    statementReconciled: false,
  }
}

// M2 "Save and add another": only property and date carry over, and only
// after a confirmed save. Payer, amount, category/subcategory,
// description, payment method and the repair/improvement flag are
// cleared so nothing is reused by accident.
export function nextEntryDraft(saved: TransactionInput): TransactionInput {
  return { ...blankTransaction(saved.transactionDate), propertyId: saved.propertyId }
}

export function transactionToInput(tx: Transaction): TransactionInput {
  const payer: TransactionInput['payer'] = tx.vendor
    ? { kind: 'vendor', id: tx.vendor.id }
    : tx.tenant
      ? { kind: 'tenant', id: tx.tenant.id }
      : tx.prospective_tenant
        ? { kind: 'prospective_tenant', id: tx.prospective_tenant.id, name: tx.prospective_tenant.name }
        : { kind: 'none' }
  return {
    propertyId: tx.property?.id ?? '',
    entryType: tx.entry_type,
    category: tx.category,
    subcategory: tx.subcategory,
    payer,
    unit: tx.unit,
    paymentMethod: tx.payment_method,
    repairOrImprovement: tx.repair_or_improvement,
    amount: Number(tx.amount),
    transactionDate: tx.transaction_date,
    description: tx.description,
    statementReconciled: tx.statement_reconciled,
  }
}

export type TransactionField = 'propertyId' | 'payer' | 'category' | 'paymentMethod' | 'amount' | 'transactionDate'

export const FIELD_NAMES: Record<TransactionField, string> = {
  propertyId: 'Property',
  payer: 'Paid to / received from',
  category: 'Category',
  paymentMethod: 'Payment method',
  amount: 'Amount',
  transactionDate: 'Date',
}

export type FieldErrors = Partial<Record<TransactionField, string>>

function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, y, m, d] = match.map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

// `isNew` distinguishes a brand-new entry (a payer is required) from an
// edit of an older transaction that legitimately has none (e.g. a
// bridged Quick Capture receipt) — the edit keeps it as stored.
export function validateTransaction(values: TransactionInput, isNew: boolean): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.propertyId) errors.propertyId = 'Choose the property this belongs to.'
  const categories: readonly string[] = values.entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  if (!categories.includes(values.category)) errors.category = 'Choose a category for this type.'
  if (values.payer.kind === 'none' && isNew) {
    errors.payer = values.entryType === 'income' ? 'Choose the tenant or vendor this came from.' : 'Choose the vendor this was paid to.'
  }
  if (values.payer.kind === 'tenant' && values.entryType !== 'income') {
    errors.payer = 'A tenant can only be the payer of income. Choose a vendor for an expense.'
  }
  if (!values.paymentMethod) errors.paymentMethod = 'Choose how this was paid.'
  if (!(values.amount > 0)) errors.amount = 'Enter an amount greater than zero.'
  else if (Math.abs(values.amount * 100 - Math.round(values.amount * 100)) > 1e-6) errors.amount = 'Use at most two decimal places.'
  if (!isRealDate(values.transactionDate)) errors.transactionDate = 'Enter a valid date.'
  return errors
}

export type SaveErrorKind = 'failed' | 'uncertain'

// A PostgREST/Postgres error carries a code (SQLSTATE or PGRST…): the
// server answered and the save definitely did not happen. No code means
// the request itself failed (dropped connection, timeout) — the server
// may or may not have saved it, so the user is told to check before
// trying again rather than being told it failed.
export function classifySaveError(error: { message: string; code?: string | null }): { kind: SaveErrorKind; message: string } {
  if (error.code) {
    return { kind: 'failed', message: `Not saved: ${error.message}` }
  }
  return {
    kind: 'uncertain',
    message:
      "We couldn't confirm whether this was saved (the connection was interrupted). Your entry is still here. Check the list below before saving again, so it isn't entered twice.",
  }
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthYear(date: string): string {
  const [year, month] = date.split('-')
  return `${SHORT_MONTHS[Number(month) - 1] ?? month} ${year}`
}

export function tenantOptionLabel(option: TenantPayerOption): string {
  const unit = option.unitLabel ? ` — ${option.unitLabel}` : ''
  const dates = `${monthYear(option.startDate)} – ${option.endDate ? monthYear(option.endDate) : 'present'}`
  return `${option.tenantName}${unit} (lease ${dates})`
}

export function describeTransaction(tx: Pick<Transaction, 'transaction_date' | 'category' | 'amount' | 'property'>, propertyName: string): string {
  return `${formatDateOnly(tx.transaction_date)} · ${propertyName} · ${CATEGORY_LABELS[tx.category]} · ${formatMoney(Number(tx.amount))}`
}

// Stored as "<account>/<property>/<category>/<uuid>-<original name>"
// (documentsQueries.uploadTransactionDocument). The original name is
// shown; the stored path is never renamed.
export function attachmentFileName(storagePath: string | null): string {
  if (!storagePath) return 'Attachment'
  const last = storagePath.split('/').pop() ?? storagePath
  return last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '') || last
}

// Year choices for the Financials/Reports year filters: every year that
// has saved records (earliest → latest, voided included so "Show voided"
// can reach them), always the recent default window, and any extra year
// (e.g. one just saved). No fixed earliest year — history can start in
// any year a property was owned.
export const DEFAULT_RECENT_YEARS = 6

export function buildYearOptions(
  range: { earliest: number | null; latest: number | null },
  currentYear: number,
  extraYears: number[] = [],
): number[] {
  const candidates = [currentYear, currentYear - (DEFAULT_RECENT_YEARS - 1), ...extraYears]
  if (range.earliest !== null) candidates.push(range.earliest)
  if (range.latest !== null) candidates.push(range.latest)
  const high = Math.max(...candidates)
  const low = Math.min(...candidates)
  return Array.from({ length: high - low + 1 }, (_, i) => high - i)
}
