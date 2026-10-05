import { HISTORY_PAYMENTS_TABLE, type HistoryPaymentPrincipal } from './reportsQueries'

// Option B (H1) business logic for history-only principal — pure, no Supabase.

interface QueryError {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

// PostgREST's answers for a table that doesn't exist yet: PGRST205 ("Could not
// find the table … in the schema cache") or Postgres 42P01 (undefined_table).
// Which one hosted returns is recorded in the H1-before-H2 hosted window.
const MISSING_RELATION_CODES = new Set(['PGRST205', '42P01'])

// The exact table name as a whole identifier ("public.mortgage_history_payments"
// or "mortgage_history_payments"), never a longer name that merely contains it.
const EXACT_TABLE = new RegExp(`(^|[^A-Za-z0-9_])${HISTORY_PAYMENTS_TABLE}(?![A-Za-z0-9_])`)

/**
 * True only for "the history table doesn't exist": a missing-relation code AND
 * the exact table named in the error's message or details. The hint is never
 * consulted — PostgREST's hint suggests OTHER, similarly named tables ("Perhaps
 * you meant …"), so a hint naming the history table proves nothing.
 */
export function isHistoryTableMissing(error: QueryError | null | undefined): boolean {
  if (!error || !error.code || !MISSING_RELATION_CODES.has(error.code)) return false
  return EXACT_TABLE.test(error.message ?? '') || EXACT_TABLE.test(error.details ?? '')
}

export interface ResolvedHistoryPrincipal {
  rows: HistoryPaymentPrincipal[]
  error: string | null
}

// Missing table → no history entries (H2 not applied). Any other error stays
// an error, shown like every other Reports failure — never a silent empty list.
export function resolveHistoryPrincipal(result: { data: HistoryPaymentPrincipal[] | null; error: QueryError | null }): ResolvedHistoryPrincipal {
  if (result.error) {
    if (isHistoryTableMissing(result.error)) return { rows: [], error: null }
    return { rows: [], error: result.error.message || 'Could not load history-only mortgage entries.' }
  }
  return { rows: result.data ?? [], error: null }
}

// Sum in cents; optionally one property's rows only (the Reports property filter).
export function sumHistoryPrincipal(rows: HistoryPaymentPrincipal[], propertyId?: string | null): number {
  const cents = rows
    .filter((r) => !propertyId || r.property_id === propertyId)
    .reduce((sum, r) => sum + Math.round(Number(r.principal_amount) * 100), 0)
  return cents / 100
}
