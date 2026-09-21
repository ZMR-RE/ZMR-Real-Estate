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
    .eq('archived', false)
    .is('end_date', null)
    .order('start_date', { ascending: false })
    .returns<PropertyCurrentTenant[]>()
}

export interface PropertyTenantOption {
  id: string
  name: string
}

// Roadmap 1.28 — Quick Capture's "Who was met with" picker needs every
// tenant who has EVER been assigned to one of this property's units
// (current or past — a visit could be with a tenant who's since moved
// out), unlike listCurrentTenantsForProperty above (current only, by
// design, for the Overview tab). Distinct by tenant since the same
// tenant can have more than one assignment period (renewals, moving
// between units on the same property).
export async function listAllTenantsForProperty(accountId: string, propertyId: string) {
  const { data, error } = await supabase
    .from('tenant_units')
    .select('tenant:tenants(id, name), unit:units!inner(property_id)')
    .eq('account_id', accountId)
    .eq('unit.property_id', propertyId)
    .eq('archived', false)
    .returns<{ tenant: { id: string; name: string } | null }[]>()

  if (error) return { data: null, error }

  const byId = new Map<string, PropertyTenantOption>()
  for (const row of data ?? []) {
    if (row.tenant) byId.set(row.tenant.id, row.tenant)
  }
  return { data: [...byId.values()].sort((a, b) => a.name.localeCompare(b.name)), error: null }
}
