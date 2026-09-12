import { supabase } from '../../shared/supabaseClient'

export interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string | null
}

export interface TenantInput {
  name: string
  email: string | null
  phone: string | null
}

export async function listTenants(accountId: string) {
  return supabase
    .from('tenants')
    .select('id, name, email, phone')
    .eq('account_id', accountId)
    .order('name')
    .returns<Tenant[]>()
}

export async function createTenant(accountId: string, input: TenantInput) {
  return supabase
    .from('tenants')
    .insert({ account_id: accountId, ...input })
    .select('id, name, email, phone')
    .single()
}

export interface TenantUnitAssignment {
  id: string
  unit_id: string
  start_date: string
  end_date: string | null
  tenant: { id: string; name: string } | null
}

export interface TenantUnitAssignmentInput {
  tenantId: string
  startDate: string
  endDate: string | null
}

// A unit's tenancy history — every row is one assignment period, not just
// the current one. end_date null means still assigned (roadmap 8.4: a
// unit can have a history of multiple tenants over time, not one FK).
export async function listTenantUnitAssignments(accountId: string, unitId: string) {
  return supabase
    .from('tenant_units')
    .select('id, unit_id, start_date, end_date, tenant:tenants(id, name)')
    .eq('account_id', accountId)
    .eq('unit_id', unitId)
    .order('start_date', { ascending: false })
    .returns<TenantUnitAssignment[]>()
}

export async function createTenantUnitAssignment(
  accountId: string,
  unitId: string,
  input: TenantUnitAssignmentInput,
) {
  return supabase
    .from('tenant_units')
    .insert({
      account_id: accountId,
      unit_id: unitId,
      tenant_id: input.tenantId,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .select('id, unit_id, start_date, end_date, tenant:tenants(id, name)')
    .single()
}
