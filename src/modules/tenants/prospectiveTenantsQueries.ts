import { supabase } from '../../shared/supabaseClient'

export interface ProspectiveTenant {
  id: string
  name: string
}

export interface ProspectiveTenantInput {
  name: string
}

// Roadmap 1.28 revision — the third category ("Potential tenants") in
// Visit's "who was met with" picker: prospective applicants/tour
// visitors who aren't yet a real Tenant (8.4) or Vendor (8.3). Scoped to
// a property the same way listAllTenantsForProperty is, since a
// prospect is inherently tied to whichever property they toured.
export async function listProspectiveTenantsForProperty(accountId: string, propertyId: string) {
  return supabase
    .from('prospective_tenants')
    .select('id, name')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('name')
    .returns<ProspectiveTenant[]>()
}

export async function createProspectiveTenant(accountId: string, propertyId: string, input: ProspectiveTenantInput) {
  return supabase
    .from('prospective_tenants')
    .insert({ account_id: accountId, property_id: propertyId, ...input })
    .select('id, name')
    .single<ProspectiveTenant>()
}
