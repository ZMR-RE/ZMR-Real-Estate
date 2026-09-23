import { supabase } from '../../shared/supabaseClient'

export interface LeaseTenantRef {
  id: string
  name: string
}

export interface Lease {
  id: string
  property_id: string
  unit_id: string
  rent_amount: string | null
  late_fee: string | null
  move_in_fee: string | null
  start_date: string
  end_date: string | null
  end_reason: string | null
  archived: boolean
  tenants: LeaseTenantRef[]
}

// tenantIds must have at least one entry — CLAUDE.md's data integrity
// rule means a lease is never created with zero named tenants; the
// LeaseForm enforces this the same way TenantAssignmentForm enforced a
// single required tenant before it.
export interface LeaseInput {
  tenantIds: string[]
  startDate: string
  endDate: string | null
  rentAmount: string | null
  lateFee: string | null
  moveInFee: string | null
}

interface LeaseRow {
  id: string
  property_id: string
  unit_id: string
  rent_amount: string | null
  late_fee: string | null
  move_in_fee: string | null
  start_date: string
  end_date: string | null
  end_reason: string | null
  archived: boolean
  lease_tenants: { tenant: LeaseTenantRef | null }[]
}

const LEASE_COLUMNS = `
  id, property_id, unit_id, rent_amount, late_fee, move_in_fee, start_date, end_date, end_reason, archived,
  lease_tenants(tenant:tenants(id, name))
`

// lease_tenants comes back as a nested array of {tenant} wrappers (the
// PostgREST embed shape) — flattened here once so every consumer just
// reads lease.tenants, not lease.lease_tenants[i].tenant.
function mapLease(row: LeaseRow): Lease {
  const { lease_tenants, ...rest } = row
  return {
    ...rest,
    tenants: lease_tenants.map((lt) => lt.tenant).filter((t): t is LeaseTenantRef => t !== null),
  }
}

// Status is computed here, not stored — same "real-time check, not a
// snapshot" approach as Insurance's getInsuranceStatus (insuranceQueries.ts).
// No cron/scheduled-function infrastructure exists in this codebase to
// keep a stored status column in sync as calendar time passes with no
// write happening, so a stored column would just go stale.
export type LeaseStatus = 'upcoming' | 'active' | 'ended'

export function getLeaseStatus(lease: Pick<Lease, 'start_date' | 'end_date'>): LeaseStatus {
  const today = new Date().toISOString().slice(0, 10)
  if (lease.start_date > today) return 'upcoming'
  if (lease.end_date !== null && lease.end_date < today) return 'ended'
  return 'active'
}

// Every lease this unit has ever had, most recent first — the "Lease
// history" sub-list (roadmap item 1: "all past leases: tenants, dates,
// rent, why ended").
export async function listLeasesForUnit(accountId: string, unitId: string) {
  const { data, error } = await supabase
    .from('leases')
    .select(LEASE_COLUMNS)
    .eq('account_id', accountId)
    .eq('unit_id', unitId)
    .order('start_date', { ascending: false })
    .returns<LeaseRow[]>()

  if (error) return { data: null, error }
  return { data: (data ?? []).map(mapLease), error: null }
}

// A lease is created with one-or-more tenants in one call — the actual
// co-tenant fix this whole rebuild exists for. Not run inside a database
// transaction/RPC (this codebase has no precedent for either — the
// closest multi-step write, documentsQueries.ts's moveToDocuments, is
// also a sequential storage-then-table write with an early return on
// failure, not a DB transaction) — if the lease_tenants insert fails
// after the lease insert succeeds, the orphaned lease row is still
// visible (no tenants attached) rather than silently vanishing, which
// is safer than a silent rollback a user wouldn't see.
export async function createLease(
  accountId: string,
  propertyId: string,
  unitId: string,
  input: LeaseInput,
) {
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

  if (leaseError || !lease) return { error: leaseError }

  const { error: linkError } = await supabase
    .from('lease_tenants')
    .insert(input.tenantIds.map((tenantId) => ({ account_id: accountId, lease_id: lease.id, tenant_id: tenantId })))

  return { error: linkError }
}

// Lease-level fields only (rent/fees/dates) — this v1 doesn't support
// changing WHO is on a lease after creation (no tenant add/remove once
// signed); none of roadmap items 1-9 asked for mid-lease tenant
// membership changes, and a wrong tenant picked at creation is
// correctable by archiving the lease and creating a new one, same
// "archive and redo" pattern already used everywhere else in this app
// for a mistaken entry.
export async function updateLease(
  id: string,
  input: Pick<LeaseInput, 'startDate' | 'endDate' | 'rentAmount' | 'lateFee' | 'moveInFee'>,
) {
  return supabase
    .from('leases')
    .update({
      start_date: input.startDate,
      end_date: input.endDate,
      rent_amount: input.rentAmount,
      late_fee: input.lateFee,
      move_in_fee: input.moveInFee,
    })
    .eq('id', id)
}

// "+ End lease" (roadmap item 2) — closes the current lease (moves it
// to history by giving it a real end_date) and records why.
export async function endLease(id: string, endDate: string, endReason: string | null) {
  return supabase.from('leases').update({ end_date: endDate, end_reason: endReason }).eq('id', id)
}

export async function setLeaseArchived(id: string, archived: boolean) {
  return supabase.from('leases').update({ archived }).eq('id', id)
}

export interface PropertyTenantRow {
  tenant: LeaseTenantRef
  leaseId: string
  unitId: string
  unitLabel: string
  isCurrent: boolean
}

// Roadmap item 3 — Overview's Tenants box directory: every tenant ever
// at this property (current highlighted, past shown secondary), each
// row carrying enough to link to /tenants/:id. isCurrent is computed
// per lease via getLeaseStatus, not a stored flag.
export async function listAllTenantsEverAtProperty(accountId: string, propertyId: string) {
  const { data, error } = await supabase
    .from('leases')
    .select(
      'id, end_date, unit:units!inner(id, unit_label, property_id), lease_tenants(tenant:tenants(id, name))',
    )
    .eq('account_id', accountId)
    .eq('unit.property_id', propertyId)
    .order('start_date', { ascending: false })
    .returns<
      {
        id: string
        end_date: string | null
        unit: { id: string; unit_label: string; property_id: string }
        lease_tenants: { tenant: LeaseTenantRef | null }[]
      }[]
    >()

  if (error) return { data: null, error }

  const today = new Date().toISOString().slice(0, 10)
  const rows: PropertyTenantRow[] = []
  const seenPerLease = new Set<string>()
  for (const lease of data ?? []) {
    const isCurrent = lease.end_date === null || lease.end_date >= today
    for (const lt of lease.lease_tenants) {
      if (!lt.tenant) continue
      const key = `${lease.id}:${lt.tenant.id}`
      if (seenPerLease.has(key)) continue
      seenPerLease.add(key)
      rows.push({ tenant: lt.tenant, leaseId: lease.id, unitId: lease.unit.id, unitLabel: lease.unit.unit_label, isCurrent })
    }
  }
  return { data: rows, error: null }
}

// Roadmap item 8 — Monthly rent stat card. Sums rent_amount across
// every currently-active lease for the property (one figure per lease,
// however many co-tenants share it — this is the whole point of the
// lease_tenants join table existing). Excludes archived leases. Not
// scoped to end_date null only — a lease with a future end_date that
// hasn't arrived yet is still currently active and paying rent today.
export async function sumActiveLeaseRentForProperty(accountId: string, propertyId: string) {
  const { data, error } = await supabase
    .from('leases')
    .select('rent_amount, start_date, end_date, archived')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .eq('archived', false)
    .returns<{ rent_amount: string | null; start_date: string; end_date: string | null; archived: boolean }[]>()

  if (error) return { data: null, error }

  const total = (data ?? [])
    .filter((lease) => getLeaseStatus(lease) === 'active' && lease.rent_amount !== null)
    .reduce((sum, lease) => sum + Number(lease.rent_amount), 0)

  return { data: total > 0 ? total : null, error: null }
}

export interface TenantLeaseHistoryEntry extends Lease {
  unit_label: string
  property_address: string
}

// Roadmap item 5 — a Tenant profile's auto-populated lease list, any
// property/unit, current + past.
export async function listLeasesForTenant(accountId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('lease_tenants')
    .select(
      `lease:leases!inner(
        id, property_id, unit_id, rent_amount, late_fee, move_in_fee, start_date, end_date, end_reason, archived,
        lease_tenants(tenant:tenants(id, name)),
        unit:units(unit_label),
        property:properties(address)
      )`,
    )
    .eq('account_id', accountId)
    .eq('tenant_id', tenantId)
    .returns<{ lease: LeaseRow & { unit: { unit_label: string }; property: { address: string } } }[]>()

  if (error) return { data: null, error }

  const entries: TenantLeaseHistoryEntry[] = (data ?? [])
    .map((row) => ({
      ...mapLease(row.lease),
      unit_label: row.lease.unit.unit_label,
      property_address: row.lease.property.address,
    }))
    .sort((a, b) => b.start_date.localeCompare(a.start_date))

  return { data: entries, error: null }
}
