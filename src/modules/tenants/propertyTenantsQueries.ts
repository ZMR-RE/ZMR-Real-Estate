import { supabase } from '../../shared/supabaseClient'

export interface PropertyTenantOption {
  id: string
  name: string
}

// Roadmap 1.28 — Quick Capture's "Who was met with" picker needs every
// tenant who has EVER been assigned to one of this property's units
// (current or past — a visit could be with a tenant who's since moved
// out). Distinct by tenant since the same tenant can have more than one
// lease on this property (renewals, moving between units).
//
// Units/Lease/Tenant rebuild — rewritten against leases/lease_tenants
// (was tenant_units). Same function name/signature/return shape, so
// Quick Capture's two call sites needed no changes.
export async function listAllTenantsForProperty(accountId: string, propertyId: string) {
  const { data, error } = await supabase
    .from('lease_tenants')
    .select('tenant:tenants(id, name), lease:leases!inner(unit:units!inner(property_id))')
    .eq('account_id', accountId)
    .eq('lease.unit.property_id', propertyId)
    .returns<{ tenant: { id: string; name: string } | null }[]>()

  if (error) return { data: null, error }

  const byId = new Map<string, PropertyTenantOption>()
  for (const row of data ?? []) {
    if (row.tenant) byId.set(row.tenant.id, row.tenant)
  }
  return { data: [...byId.values()].sort((a, b) => a.name.localeCompare(b.name)), error: null }
}
