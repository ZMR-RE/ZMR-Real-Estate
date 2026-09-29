import { supabase } from '../../shared/supabaseClient'

// M4 — tenants a transaction can be received from, for one property.
// Uses the existing supported relationship only: financial_transactions
// .tenant_id → tenants, with the property link coming from the tenant's
// lease(s) at that property (lease_tenants → leases.property_id/unit).
// Past leases are included so prior-year rent can be entered; archived
// leases are not (they "stop counting as real anywhere", same rule as
// the property's Tenants box). One option per tenant + lease, so a
// tenant who renewed or moved units is shown with each lease's unit and
// dates rather than as an ambiguous duplicate name. The stored value is
// the tenant id; the lease details are for identification only.
export interface TenantPayerOption {
  tenantId: string
  tenantName: string
  leaseId: string
  unitLabel: string
  startDate: string
  endDate: string | null
}

interface LeaseRow {
  id: string
  start_date: string
  end_date: string | null
  unit: { unit_label: string } | null
  lease_tenants: { tenant: { id: string; name: string } | null }[]
}

export async function listTenantPayerOptions(accountId: string, propertyId: string) {
  const { data, error } = await supabase
    .from('leases')
    .select('id, start_date, end_date, unit:units(unit_label), lease_tenants(tenant:tenants(id, name))')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .eq('archived', false)
    .order('start_date', { ascending: false })
    .returns<LeaseRow[]>()

  if (error) return { data: null, error }

  const options: TenantPayerOption[] = []
  for (const lease of data ?? []) {
    for (const link of lease.lease_tenants) {
      if (!link.tenant) continue
      options.push({
        tenantId: link.tenant.id,
        tenantName: link.tenant.name,
        leaseId: lease.id,
        unitLabel: lease.unit?.unit_label ?? '',
        startDate: lease.start_date,
        endDate: lease.end_date,
      })
    }
  }
  options.sort((a, b) => a.tenantName.localeCompare(b.tenantName) || b.startDate.localeCompare(a.startDate))
  return { data: options, error: null }
}
