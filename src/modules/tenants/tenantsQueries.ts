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

// tenant_units is also the Lease record (roadmap 8.5) — one row per
// tenancy period already is one lease period, so rent_amount/late_fee
// were added directly onto this table (20260915100000_lease_fields.sql)
// rather than standing up a second, separate leases table that would
// just duplicate the tenant+unit+date-range linking 8.4 already built.
export interface TenantUnitAssignment {
  id: string
  unit_id: string
  start_date: string
  end_date: string | null
  rent_amount: string | null
  late_fee: string | null
  tenant: { id: string; name: string } | null
  archived: boolean
}

export interface TenantUnitAssignmentInput {
  tenantId: string
  startDate: string
  endDate: string | null
  rentAmount: string | null
  lateFee: string | null
}

const TENANT_UNIT_ASSIGNMENT_COLUMNS =
  'id, unit_id, start_date, end_date, rent_amount, late_fee, tenant:tenants(id, name), archived'

// A unit's tenancy history — every row is one assignment period, not just
// the current one. end_date null means still assigned (roadmap 8.4: a
// unit can have a history of multiple tenants over time, not one FK).
export async function listTenantUnitAssignments(accountId: string, unitId: string) {
  return supabase
    .from('tenant_units')
    .select(TENANT_UNIT_ASSIGNMENT_COLUMNS)
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
      rent_amount: input.rentAmount,
      late_fee: input.lateFee,
    })
    .select(TENANT_UNIT_ASSIGNMENT_COLUMNS)
    .single()
}

// Roadmap 8.12 — archive/restore for a tenant assignment (the dashboard
// surface for "remove a Tenant record": a wrong/test assignment, same
// scenario as an incorrect Financial account or Organization type).
// Never a hard delete — an archived assignment still shows in this
// unit's tenancy history, just stops counting as a real current/past
// tenant anywhere else (Overview's Tenants box, Quick Capture's "who
// was met with" picker). The underlying Tenant (person) record is
// untouched and stays selectable for future assignments.
export async function setTenantUnitAssignmentArchived(id: string, archived: boolean) {
  return supabase
    .from('tenant_units')
    .update({ archived })
    .eq('id', id)
    .select(TENANT_UNIT_ASSIGNMENT_COLUMNS)
    .single()
}
