// Pure rules for creating a tenancy (a lease with one or more tenants).
// Shared by Units › + Add lease and Property Overview › Tenants › Add tenant,
// so both entry points behave the same.

export interface TenantChoice {
  id: string
  label: string
}

// A co-tenant slot never offers a person already chosen in another slot, so
// the same tenant can't be put on one lease twice.
export function slotOptions<T extends TenantChoice>(options: T[], tenantIds: (string | null)[], slot: number): T[] {
  const taken = new Set(tenantIds.filter((id, i): id is string => id !== null && i !== slot))
  return options.filter((o) => !taken.has(o.id))
}

// The tenants to save: chosen slots only, each person once, in slot order.
export function uniqueTenantIds(tenantIds: (string | null)[]): string[] {
  return [...new Set(tenantIds.filter((id): id is string => id !== null))]
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

// Existing tenants with the same name as a "new" one, so a person saved
// earlier (e.g. before a lease failed or was cancelled) is reused rather than
// created twice. Matching only offers the choice; it never merges anyone.
export function tenantsNamed<T extends TenantChoice>(options: T[], name: string): T[] {
  const key = normalizeName(name)
  return key ? options.filter((o) => normalizeName(o.label) === key) : []
}

// The tenant links a lease still needs. A retry after a partial failure adds
// only these, to the lease already saved — never a second lease.
export function missingTenantIds(wanted: string[], alreadyLinked: string[]): string[] {
  const linked = new Set(alreadyLinked)
  return wanted.filter((id) => !linked.has(id))
}
