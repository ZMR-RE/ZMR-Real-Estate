import { supabase } from '../../shared/supabaseClient'

// O1-A ownership foundation (Batch G/I) — every Supabase call for
// property title interests and entity membership interests, kept in one
// file per CLAUDE.md's module-shape rule: every write to
// property_ownership_interests/llc_membership_interests is mediated by
// property_ownership_corrections/llc_membership_corrections (a reason is
// required on every change, per D1/I4), so splitting the interest reads
// from the correction-aware writes across files would make it easy for a
// future caller to write one without the other. Both mutation paths call
// the same two SECURITY DEFINER Postgres functions
// (replace_property_ownership_interests / replace_llc_membership_interests,
// 20260925060000_ownership_interest_functions.sql) — there is no other
// insert/update/delete path into either interest table; RLS on both grants
// SELECT only to the authenticated role, verified directly against a
// scratch Postgres instance (see the implementation contract's
// verification section for what was actually executed, not just written).

export interface OwnershipEntryInput {
  ownerId: string
  // null = "not yet known" (never coerced to 0, per CLAUDE.md's
  // Data integrity rule and I1's "no inferred remainder").
  percentage: number | null
  effectiveDate?: string | null
}

export interface PropertyOwnershipInterest {
  id: string
  property_id: string
  llc_id: string
  owner_name: string
  // Package 1 §2 — needed to detect the "owner kind unresolved" case
  // (an owner whose llcs.owner_kind is still null) without a second
  // query; carried straight through from the same embedded llcs row
  // owner_name already reads display_name/name from.
  owner_kind: 'individual' | 'entity' | null
  percentage: number | null
  effective_date: string | null
  end_date: string | null
  is_current: boolean
  recorded_at: string
}

export interface LlcMembershipInterest {
  id: string
  llc_id: string
  member_llc_id: string
  member_name: string
  percentage: number | null
  effective_date: string | null
  end_date: string | null
  is_current: boolean
  recorded_at: string
}

// 'complete' is an explicit assertion the user makes on save (see
// AllocationStatus below) — never inferred here or anywhere else from
// "every current owner happens to have a known percentage." A single
// owner entered at 48% with nothing else on file reads as 'incomplete',
// not 'complete', until the user explicitly says this is the full list.
export type OwnershipCompleteness = 'none' | 'incomplete' | 'complete'

export interface OwnershipSummary {
  owner_count: number
  owners_with_percentage: number
  percentage_total: number | null
  completeness: OwnershipCompleteness
}

// What the caller asserts on every save — required, not inferred. See
// _validate_ownership_entries in 20260925060000_ownership_interest_functions.sql:
// 'complete' is rejected server-side unless every current entry has a
// known percentage summing to exactly 100.
export type AllocationStatus = 'incomplete' | 'complete'

export interface PropertyOwnershipCorrection {
  id: string
  llc_id: string
  change_type: 'added' | 'removed' | 'percentage_changed'
  previous_percentage: number | null
  new_percentage: number | null
  reason: string
  corrected_at: string
}

const PROPERTY_INTEREST_COLUMNS =
  'id, property_id, llc_id, owner_name:llcs(display_name, name, owner_kind), percentage, effective_date, end_date, is_current, recorded_at'

// Current owners for a property, most-recent-first among ties broken by
// percentage — used by both the property's own Ownership section and
// (filtered client-side by llc_id via listLlcOwnedProperties below) the
// entity's Linked properties panel.
export async function listPropertyOwnershipInterests(accountId: string, propertyId: string) {
  const { data, error } = await supabase
    .from('property_ownership_interests')
    .select(PROPERTY_INTEREST_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .eq('is_current', true)
    .order('percentage', { ascending: false, nullsFirst: false })

  if (error || !data) return { data: null, error }

  // Supabase's embedded-resource shape comes back as an object (or array,
  // depending on relationship direction); normalize to a flat display name
  // here so every caller gets a plain string, not a nested shape to unpack.
  const rows: PropertyOwnershipInterest[] = data.map((row) => {
    const owner = row.owner_name as unknown as { display_name: string | null; name: string; owner_kind: 'individual' | 'entity' | null } | null
    return {
      id: row.id,
      property_id: row.property_id,
      llc_id: row.llc_id,
      owner_name: owner?.display_name ?? owner?.name ?? 'Unknown owner',
      owner_kind: owner?.owner_kind ?? null,
      percentage: row.percentage,
      effective_date: row.effective_date,
      end_date: row.end_date,
      is_current: row.is_current,
      recorded_at: row.recorded_at,
    }
  })
  return { data: rows, error: null }
}

// Every property this entity currently has a title interest in — the
// entity profile's "Linked properties" panel, replacing the earlier plain
// listPropertiesByLlc-only view with one that also carries percentage.
export async function listLlcOwnedProperties(accountId: string, llcId: string) {
  return supabase
    .from('property_ownership_interests')
    .select('id, property_id, percentage, effective_date, property:properties(id, name, address)')
    .eq('account_id', accountId)
    .eq('llc_id', llcId)
    .eq('is_current', true)
    .order('percentage', { ascending: false, nullsFirst: false })
}

export async function listLlcMembershipInterests(accountId: string, llcId: string) {
  const { data, error } = await supabase
    .from('llc_membership_interests')
    .select('id, llc_id, member_llc_id, member_name:llcs!llc_membership_interests_member_llc_id_fkey(display_name, name), percentage, effective_date, end_date, is_current, recorded_at')
    .eq('account_id', accountId)
    .eq('llc_id', llcId)
    .eq('is_current', true)
    .order('percentage', { ascending: false, nullsFirst: false })

  if (error || !data) return { data: null, error }

  const rows: LlcMembershipInterest[] = data.map((row) => {
    const member = row.member_name as unknown as { display_name: string | null; name: string } | null
    return {
      id: row.id,
      llc_id: row.llc_id,
      member_llc_id: row.member_llc_id,
      member_name: member?.display_name ?? member?.name ?? 'Unknown member',
      percentage: row.percentage,
      effective_date: row.effective_date,
      end_date: row.end_date,
      is_current: row.is_current,
      recorded_at: row.recorded_at,
    }
  })
  return { data: rows, error: null }
}

// A property/entity with no interest rows yet has no version row either
// (20260925050000_ownership_interests.sql's version tables are only
// created lazily, by the first successful write) — 0 is the correct
// "nothing written yet" expected-version value for that case, not a
// missing-data error.
export async function getPropertyOwnershipVersion(propertyId: string): Promise<number> {
  const { data } = await supabase
    .from('property_ownership_versions')
    .select('version')
    .eq('property_id', propertyId)
    .maybeSingle()
  return data?.version ?? 0
}

export async function getLlcMembershipVersion(llcId: string): Promise<number> {
  const { data } = await supabase.from('llc_membership_versions').select('version').eq('llc_id', llcId).maybeSingle()
  return data?.version ?? 0
}

export async function getPropertyOwnershipSummary(accountId: string, propertyId: string) {
  return supabase
    .from('property_ownership_summary')
    .select('owner_count, owners_with_percentage, percentage_total, completeness')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .maybeSingle<OwnershipSummary>()
}

export async function getLlcMembershipSummary(accountId: string, llcId: string) {
  return supabase
    .from('llc_membership_summary')
    .select('member_count, members_with_percentage, percentage_total, completeness')
    .eq('account_id', accountId)
    .eq('llc_id', llcId)
    .maybeSingle<{ member_count: number; members_with_percentage: number; percentage_total: number | null; completeness: OwnershipCompleteness }>()
}

export async function listPropertyOwnershipCorrections(accountId: string, propertyId: string) {
  return supabase
    .from('property_ownership_corrections')
    .select('id, llc_id, change_type, previous_percentage, new_percentage, reason, corrected_at')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('corrected_at', { ascending: false })
    .returns<PropertyOwnershipCorrection[]>()
}

// The sole write path for a property's ownership. `entries` is the
// COMPLETE desired set of currently-effective owners — any existing
// current owner not present in it is treated as removed. One RPC call is
// one Postgres transaction: a multi-owner rebalance (e.g. 48/52 -> 50/50)
// either fully applies or fully fails, never leaving an invalid
// intermediate state observable to another reader.
export async function replacePropertyOwnershipInterests(
  propertyId: string,
  entries: OwnershipEntryInput[],
  reason: string,
  expectedVersion: number,
  allocationStatus: AllocationStatus,
) {
  return supabase.rpc('replace_property_ownership_interests', {
    p_property_id: propertyId,
    p_entries: entries.map((e) => ({ owner_id: e.ownerId, percentage: e.percentage, effective_date: e.effectiveDate ?? null })),
    p_reason: reason,
    p_expected_version: expectedVersion,
    p_allocation_status: allocationStatus,
  })
}

export async function replaceLlcMembershipInterests(
  llcId: string,
  entries: OwnershipEntryInput[],
  reason: string,
  expectedVersion: number,
  allocationStatus: AllocationStatus,
) {
  return supabase.rpc('replace_llc_membership_interests', {
    p_llc_id: llcId,
    p_entries: entries.map((e) => ({ owner_id: e.ownerId, percentage: e.percentage, effective_date: e.effectiveDate ?? null })),
    p_reason: reason,
    p_expected_version: expectedVersion,
    p_allocation_status: allocationStatus,
  })
}

// --- Pure helpers (no Supabase import, no I/O — unit-testable in isolation) ---

// Package 1 §2 — the one place every llc_id consumer resolves whether
// properties.llc_id (a legacy, pre-ownership-interests pointer) may be
// trusted, instead of each consumer re-deriving its own answer. Mirrors
// the contract's six-case table exactly; only 'transitioned-to-one'
// treats an owner as authoritative, and even then the authoritative id
// comes from the real interest row, never from the (possibly stale)
// properties.llc_id column itself.
export type OwnershipAuthority =
  | { case: 'none'; authoritative: false }
  | { case: 'legacy_only'; authoritative: false; legacyLlcId: string }
  | { case: 'one_incomplete'; authoritative: false }
  | { case: 'kind_unresolved'; authoritative: false }
  | { case: 'multiple'; authoritative: false }
  | { case: 'transitioned_to_one'; authoritative: true; llcId: string }

export function resolveOwnershipAuthority(
  interests: Pick<PropertyOwnershipInterest, 'llc_id' | 'owner_kind'>[],
  completeness: OwnershipCompleteness,
  legacyLlcId: string | null,
): OwnershipAuthority {
  if (interests.length === 0) {
    return legacyLlcId ? { case: 'legacy_only', authoritative: false, legacyLlcId } : { case: 'none', authoritative: false }
  }
  if (interests.some((i) => i.owner_kind === null)) {
    return { case: 'kind_unresolved', authoritative: false }
  }
  if (interests.length >= 2) {
    return { case: 'multiple', authoritative: false }
  }
  // Exactly one current interest.
  if (completeness === 'complete') {
    return { case: 'transitioned_to_one', authoritative: true, llcId: interests[0].llc_id }
  }
  return { case: 'one_incomplete', authoritative: false }
}

// Package 1 §2 — the "Organization type" line's own display text for
// each of the six cases. ownerLabel is the current single owner's label
// (only meaningful for 'one_incomplete'/'transitioned_to_one'; ignored
// otherwise) and legacyLabel is the legacy llc_id's own label (only
// meaningful for 'legacy_only') — both resolved by the caller from
// llcOptions, since this function stays free of any UI-lookup concern.
export function describeOrganizationType(authority: OwnershipAuthority, ownerLabel: string | null, legacyLabel: string | null): string {
  switch (authority.case) {
    case 'none':
      return 'No owner recorded'
    case 'legacy_only':
      return `Ownership not yet confirmed (previously recorded as: ${legacyLabel ?? 'unknown'})`
    case 'one_incomplete':
      return `${ownerLabel ?? 'Unknown owner'} — additional owners may exist, allocation not yet marked complete`
    case 'kind_unresolved':
      return 'Owner type unresolved'
    case 'multiple':
      return 'Multiple owners — see Ownership section below'
    case 'transitioned_to_one':
      return ownerLabel ?? 'Unknown owner'
  }
}

export interface OwnershipErrorInterpretation {
  kind: 'stale' | 'validation' | 'authorization' | 'not_found' | 'unknown'
  message: string
}

// Maps the custom Postgres error codes raised by the ownership functions
// (ZM001-ZM004, see 20260925060000_ownership_interest_functions.sql) to a
// UI-actionable category, so the caller can show "refresh and retry" for
// a stale write versus a plain validation message for a bad percentage,
// without string-matching the raw Postgres message text.
export function interpretOwnershipError(error: { code?: string | null; message: string } | null): OwnershipErrorInterpretation {
  if (!error) return { kind: 'unknown', message: 'Something went wrong.' }
  switch (error.code) {
    case 'ZM001':
      return { kind: 'stale', message: error.message }
    case 'ZM002':
      return { kind: 'authorization', message: error.message }
    case 'ZM003':
      return { kind: 'validation', message: error.message }
    case 'ZM004':
      return { kind: 'not_found', message: error.message }
    default:
      return { kind: 'unknown', message: error.message }
  }
}

export interface ClientSideValidationResult {
  valid: boolean
  error?: string
}

// Client-side convenience only, mirroring the server's own rules
// (_validate_ownership_entries in 20260925060000_ownership_interest_functions.sql)
// so the Save button can be disabled and an inline error shown before a
// round trip — NOT the authoritative check. The server re-validates every
// one of these rules regardless of what the client already checked, since
// a client-side check can be bypassed and must never be the only gate.
//
// `allocationStatus` must be passed explicitly by the caller — this
// function never infers 'complete' from the entries themselves (a single
// owner entered at 48% with nothing else is a valid 'incomplete' set, not
// an error, and not silently treated as finished). This mirrors a real
// correction made after an earlier version of both this function and its
// server-side counterpart wrongly inferred completeness from "every
// entry has a known percentage."
export function validateOwnershipEntriesClientSide(
  entries: OwnershipEntryInput[],
  allocationStatus: AllocationStatus,
): ClientSideValidationResult {
  const seen = new Set<string>()
  let knownSum = 0
  let unknownCount = 0

  for (const entry of entries) {
    if (seen.has(entry.ownerId)) {
      return { valid: false, error: 'Each owner can appear only once.' }
    }
    seen.add(entry.ownerId)

    if (entry.percentage === null) {
      unknownCount += 1
      continue
    }
    const rounded = Math.round(entry.percentage * 100) / 100
    if (rounded <= 0 || rounded > 100) {
      return { valid: false, error: 'Percentage must be greater than 0 and no more than 100.' }
    }
    knownSum = Math.round((knownSum + rounded) * 100) / 100
  }

  // Applies regardless of allocationStatus.
  if (knownSum > 100) {
    return { valid: false, error: `Known percentages cannot exceed 100% (currently ${knownSum}%).` }
  }

  if (allocationStatus === 'complete') {
    if (entries.length === 0) {
      return { valid: false, error: 'A complete allocation must include at least one owner.' }
    }
    if (unknownCount > 0) {
      return { valid: false, error: 'A complete allocation cannot include an owner with an unknown percentage.' }
    }
    if (knownSum !== 100) {
      return { valid: false, error: `A complete allocation must total exactly 100% (currently ${knownSum}%).` }
    }
  }

  return { valid: true }
}
