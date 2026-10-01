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

// A tenancy whose lease saved but whose tenant links never did (see
// leaseEntryQueries.ts). Read from saved records, so it is still found after
// Cancel, navigation or a reload.
export function unfinishedLeases<T extends { archived: boolean; tenants: unknown[] }>(leases: T[]): T[] {
  return leases.filter((l) => !l.archived && l.tenants.length === 0)
}

export interface TenantDetails {
  email: string | null
  phone: string | null
  created_at?: string | null
}

// What tells two same-name people apart: their contact details and when
// they were added. Never guessed — only what's on their record.
export function tenantDetail(t: TenantDetails, formatDate: (d: string) => string): string {
  const parts = [t.email, t.phone].filter((v): v is string => !!v)
  if (parts.length === 0) parts.push('no email or phone on file')
  if (t.created_at) parts.push(`added ${formatDate(t.created_at.slice(0, 10))}`)
  return parts.join(' · ')
}

// Picker labels: a person who shares a name with someone else shows their
// details too, so the right one can be chosen. Unique names stay plain.
export function withSameNameDetails<T extends TenantChoice & { detail?: string }>(options: T[]): T[] {
  const counts = new Map<string, number>()
  for (const o of options) counts.set(normalizeName(o.label), (counts.get(normalizeName(o.label)) ?? 0) + 1)
  return options.map((o) => ((counts.get(normalizeName(o.label)) ?? 0) > 1 && o.detail ? { ...o, label: `${o.label} — ${o.detail}` } : o))
}

export function formatRent(amount: string | number | null): string {
  return amount === null ? 'no rent entered' : `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// The short form of a lease ID shown to the owner (enough to tell two apart).
export function shortLeaseId(id: string): string {
  return id.slice(0, 8)
}

// A saved lease's dates, rent and fees as the lease form's starting values
// (resuming an unfinished tenancy picks up what was already saved).
export function leaseFormInitial(l: { start_date: string; end_date: string | null; rent_amount: string | number | null; late_fee: string | number | null; move_in_fee: string | number | null }) {
  const text = (v: string | number | null) => (v === null ? null : String(v))
  return { startDate: l.start_date, endDate: l.end_date, rentAmount: text(l.rent_amount), lateFee: text(l.late_fee), moveInFee: text(l.move_in_fee) }
}
