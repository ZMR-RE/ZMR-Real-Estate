import { supabase } from '../../shared/supabaseClient'

export interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
}

export interface TenantInput {
  name: string
  email: string | null
  phone: string | null
  notes: string | null
}

const TENANT_COLUMNS = 'id, name, email, phone, notes'

export async function listTenants(accountId: string) {
  return supabase.from('tenants').select(TENANT_COLUMNS).eq('account_id', accountId).order('name').returns<Tenant[]>()
}

export async function getTenant(accountId: string, tenantId: string) {
  return supabase
    .from('tenants')
    .select(TENANT_COLUMNS)
    .eq('account_id', accountId)
    .eq('id', tenantId)
    .single()
    .returns<Tenant>()
}

export async function updateTenant(id: string, input: TenantInput) {
  return supabase.from('tenants').update(input).eq('id', id).select(TENANT_COLUMNS).single()
}

export async function createTenant(accountId: string, input: TenantInput) {
  return supabase.from('tenants').insert({ account_id: accountId, ...input }).select(TENANT_COLUMNS).single()
}

// tenant_units-based assignment CRUD (TenantUnitAssignment,
// listTenantUnitAssignments, createTenantUnitAssignment,
// setTenantUnitAssignmentArchived) removed — fully superseded by
// leasesQueries.ts (leases/lease_tenants) in the Units/Lease/Tenant
// rebuild. tenant_units itself is kept, deprecated, per that
// migration's own comment (never dropped without confirmed zero data).
