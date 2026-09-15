import { supabase } from '../../shared/supabaseClient'

export interface PropertyCurrentTenant {
  id: string
  start_date: string
  rent_amount: string | null
  tenant: { id: string; name: string } | null
  unit: { id: string; unit_label: string } | null
}

// A property-wide rollup of every unit's *current* tenant (end_date
// null), for the Overview tab's Tenants box (roadmap 7.10). Full
// tenancy history and assignment/editing stays on each unit's own
// Tenants box inside the Units section — this is read-only, so it's a
// standalone query rather than reusing useTenantAssignments (which is
// unit-scoped and mutation-capable).
export async function listCurrentTenantsForProperty(accountId: string, propertyId: string) {
  return supabase
    .from('tenant_units')
    .select('id, start_date, rent_amount, tenant:tenants(id, name), unit:units!inner(id, unit_label, property_id)')
    .eq('account_id', accountId)
    .eq('unit.property_id', propertyId)
    .is('end_date', null)
    .order('start_date', { ascending: false })
    .returns<PropertyCurrentTenant[]>()
}
