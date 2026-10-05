// Mortgage tab presentation logic — pure functions only (no Supabase, no
// React). Every figure here is derived from records linked to ONE loan;
// nothing is inferred from amounts, and a missing record is reported as
// missing rather than filled in.

export const HISTORY_PAGE_SIZE = 5

export interface Page<T> {
  items: T[]
  page: number
  pageCount: number
  // "1–5 of 8"; "" when there is nothing to show.
  rangeLabel: string
}

export function paginate<T>(all: T[], page: number, size = HISTORY_PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(all.length / size))
  const current = Math.min(Math.max(page, 0), pageCount - 1)
  const start = current * size
  const items = all.slice(start, start + size)
  const rangeLabel = all.length === 0 ? '' : `${start + 1}–${start + items.length} of ${all.length}`
  return { items, page: current, pageCount, rangeLabel }
}

// ---------------------------------------------------------------------------
// Recorded payments this year — loan-linked only.
// ---------------------------------------------------------------------------

export interface LoanPaymentRecord {
  payment_date: string // YYYY-MM-DD
  principal_amount: number
  interest_amount: number
  voided: boolean
  // NULL for entries saved before payments were linked to a loan; those are
  // property-level history and may belong to an earlier loan.
  mortgage_id: string | null
  // History-only entries: an entry dated on/before the loan's
  // opening point, stored as "already included in the opening balance". It is
  // still a real payment on this loan, so it counts toward the totals; it is
  // only reported separately. Absent = a normal entry.
  history_only?: boolean
}

export interface YearPaymentSummary {
  year: number
  principal: number
  interest: number
  count: number
  firstDate: string
  lastDate: string
  // Calendar months between the first and last linked payment with no
  // linked payment, e.g. ['2026-04'].
  monthsWithoutPayment: string[]
  // Of `count`, how many are history-only entries (Option B).
  historyOnlyCount: number
}

export interface YearPaymentCoverage {
  // null when this loan has no linked, non-voided payment in the year —
  // the caller shows no total at all (never a $0.00).
  summary: YearPaymentSummary | null
  // Non-voided payments in the same year that are not linked to any loan,
  // so are not counted. Reported, never silently dropped.
  unlinkedCount: number
}

const monthKey = (isoDate: string) => isoDate.slice(0, 7)

function monthsBetween(first: string, last: string): string[] {
  const out: string[] = []
  let y = Number(first.slice(0, 4))
  let m = Number(first.slice(5, 7))
  const endY = Number(last.slice(0, 4))
  const endM = Number(last.slice(5, 7))
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

const cents = (n: number) => Math.round(n * 100) / 100

export function summarizeYearPayments(payments: LoanPaymentRecord[], loanId: string, year: number): YearPaymentCoverage {
  const inYear = payments.filter((p) => !p.voided && p.payment_date.startsWith(`${year}-`))
  const linked = inYear.filter((p) => p.mortgage_id === loanId).sort((a, b) => a.payment_date.localeCompare(b.payment_date))
  const unlinkedCount = inYear.filter((p) => p.mortgage_id === null).length
  if (linked.length === 0) return { summary: null, unlinkedCount }

  const firstDate = linked[0].payment_date
  const lastDate = linked[linked.length - 1].payment_date
  const paidMonths = new Set(linked.map((p) => monthKey(p.payment_date)))
  return {
    unlinkedCount,
    summary: {
      year,
      principal: cents(linked.reduce((s, p) => s + p.principal_amount, 0)),
      interest: cents(linked.reduce((s, p) => s + p.interest_amount, 0)),
      count: linked.length,
      firstDate,
      lastDate,
      monthsWithoutPayment: monthsBetween(monthKey(firstDate), monthKey(lastDate)).filter((m) => !paidMonths.has(m)),
      historyOnlyCount: linked.filter((p) => p.history_only === true).length,
    },
  }
}
