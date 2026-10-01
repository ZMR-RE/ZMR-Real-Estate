import { supabase } from '../../shared/supabaseClient'
import { missingTenantIds } from './leaseFormLogic'
import { updateLease, type LeaseInput } from './leasesQueries'

// Creating a tenancy: the lease row, then its tenant links. Shared by
// Units › + Add lease and Property Overview › Tenants › + Add tenant.
//
// Not atomic: these are two writes (this codebase has no transaction/RPC
// precedent for leases). If the links fail after the lease saved, the lease
// is kept with no tenants — an "unfinished tenancy". It is found again from
// the saved records (no tenants linked), not from screen memory, so it
// survives Cancel, navigation and reload, and both entry points offer to
// resume it by ID. It is never deleted or adopted automatically.
// Proposed durable fix (needs its own migration review and approval): one
// database function that inserts the lease and its tenant links together.

// Links the given tenants to a lease, skipping any already linked — so a
// retry adds only what's missing. lease_tenants also has unique
// (lease_id, tenant_id), so a person is never on one lease twice.
async function linkMissingTenants(accountId: string, leaseId: string, tenantIds: string[]) {
  const { data: linked, error: readError } = await supabase.from('lease_tenants').select('tenant_id').eq('lease_id', leaseId).returns<{ tenant_id: string }[]>()
  if (readError) return { error: readError }
  const missing = missingTenantIds(tenantIds, (linked ?? []).map((r) => r.tenant_id))
  if (missing.length === 0) return { error: null }
  const { error } = await supabase
    .from('lease_tenants')
    .insert(missing.map((tenantId) => ({ account_id: accountId, lease_id: leaseId, tenant_id: tenantId })))
  return { error }
}

// A new tenancy with one or more tenants. With `existingLeaseId` (a retry, or
// resuming an unfinished tenancy) it updates that lease's fields and links
// only the tenants still missing — never a second lease.
export async function createLease(
  accountId: string,
  propertyId: string,
  unitId: string,
  input: LeaseInput,
  existingLeaseId: string | null = null,
): Promise<{ leaseId: string | null; error: { message: string } | null }> {
  let leaseId = existingLeaseId
  if (leaseId) {
    const { error: updateError } = await updateLease(leaseId, input)
    if (updateError) return { leaseId, error: updateError }
  } else {
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .insert({
        account_id: accountId,
        property_id: propertyId,
        unit_id: unitId,
        rent_amount: input.rentAmount,
        late_fee: input.lateFee,
        move_in_fee: input.moveInFee,
        start_date: input.startDate,
        end_date: input.endDate,
      })
      .select('id')
      .single()
    if (leaseError || !lease) return { leaseId: null, error: leaseError ?? { message: 'Could not save the lease' } }
    leaseId = lease.id as string
  }
  const { error } = await linkMissingTenants(accountId, leaseId, input.tenantIds)
  return { leaseId, error }
}

// Adds co-tenants to an existing tenancy. Only links people: the lease's
// rent, dates and fees are not touched, so the rent is still counted once.
export async function addCoTenants(accountId: string, leaseId: string, tenantIds: string[]) {
  return linkMissingTenants(accountId, leaseId, tenantIds)
}
