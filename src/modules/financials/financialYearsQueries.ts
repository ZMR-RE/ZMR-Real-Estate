import { supabase } from '../../shared/supabaseClient'

// Earliest and latest transaction years on file for the account (voided
// included), for the year filters. Two ordered single-row reads rather
// than fetching every row.
export async function getTransactionYearRange(accountId: string) {
  const [first, last] = await Promise.all([
    supabase.from('financial_transactions').select('transaction_date').eq('account_id', accountId).order('transaction_date', { ascending: true }).limit(1).returns<{ transaction_date: string }[]>(),
    supabase.from('financial_transactions').select('transaction_date').eq('account_id', accountId).order('transaction_date', { ascending: false }).limit(1).returns<{ transaction_date: string }[]>(),
  ])
  const error = first.error ?? last.error
  if (error) return { data: null, error }
  const year = (rows: { transaction_date: string }[] | null) => (rows && rows[0] ? Number(rows[0].transaction_date.slice(0, 4)) : null)
  return { data: { earliest: year(first.data), latest: year(last.data) }, error: null }
}
