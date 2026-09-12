import { supabase } from '../../shared/supabaseClient'

// Capital improvements are never entered directly — they're the sum of
// this property's non-voided expense transactions already flagged
// repair_or_improvement = 'improvement' in Financials (2.3). Reading
// straight from financial_transactions here rather than adding a second,
// manually-maintained total avoids the two ever drifting apart.
export async function listCapitalImprovementAmounts(propertyId: string) {
  return supabase
    .from('financial_transactions')
    .select('amount')
    .eq('property_id', propertyId)
    .eq('entry_type', 'expense')
    .eq('repair_or_improvement', 'improvement')
    .eq('voided', false)
}
