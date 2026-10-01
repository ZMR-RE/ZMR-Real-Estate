import { supabase } from '../../shared/supabaseClient'

// Entity books, first slice: which entity's books a transaction belongs
// to (financial_transactions.responsible_entity_id). The entity is only
// ever set by the owner's explicit save; the server only suggests.

export interface EntityOption {
  id: string
  name: string
  archived: boolean
}

// Read fresh every time the picker opens (cross-module freshness): the
// entities themselves are owned by the Entities screens.
export async function listEntityOptions(accountId: string) {
  return supabase
    .from('llcs')
    .select('id, name, archived')
    .eq('account_id', accountId)
    .order('name')
    .returns<EntityOption[]>()
}

// The property's sole owner on that date, or null when ownership is shared,
// partial, not fully dated or not recorded (suggested_transaction_entity).
export async function suggestTransactionEntity(propertyId: string, transactionDate: string) {
  const { data, error } = await supabase.rpc('suggested_transaction_entity', { p_property_id: propertyId, p_date: transactionDate })
  return { data: typeof data === 'string' ? data : null, error }
}

// Every active transaction with no entity confirmed, by date only: the
// Action Queue item counts them per year. Voided entries never need one.
export async function listNeedsEntityDates(accountId: string) {
  return supabase
    .from('financial_transactions')
    .select('transaction_date')
    .eq('account_id', accountId)
    .eq('voided', false)
    .is('responsible_entity_id', null)
    .returns<{ transaction_date: string }[]>()
}
