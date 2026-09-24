// JS re-implementation of the two SQL functions
// (supabase/migrations/20260925060000_ownership_interest_functions.sql)
// for the isolated harness only — this lets the harness exercise the same
// validation/atomicity/history rules interactively in a real browser,
// without a real database. It is a mirror kept deliberately close to the
// SQL, not the source of truth (the SQL is, and was verified directly
// against a scratch Postgres instance — see the implementation contract).
import type { MockDb, MockRow } from './mockSupabase'

interface Entry {
  owner_id: string
  percentage: number | null
  effective_date: string | null
}

function validate(entries: Entry[], allocationStatus: string): { error?: string } {
  const seen = new Set<string>()
  let knownSum = 0
  let unknownCount = 0

  for (const entry of entries) {
    if (seen.has(entry.owner_id)) return { error: 'Each owner can appear only once in a single ownership set.' }
    seen.add(entry.owner_id)
    if (entry.percentage === null) {
      unknownCount += 1
    } else {
      const pct = Math.round(entry.percentage * 100) / 100
      if (pct <= 0 || pct > 100) return { error: `Percentage must be greater than 0 and no more than 100 (got ${pct}).` }
      knownSum = Math.round((knownSum + pct) * 100) / 100
    }
  }

  if (knownSum > 100) return { error: `Known ownership percentages cannot exceed 100% (currently ${knownSum}).` }
  if (allocationStatus === 'complete') {
    if (entries.length === 0) return { error: 'A complete allocation must include at least one owner.' }
    if (unknownCount > 0) return { error: 'A complete allocation cannot include an owner with an unknown percentage.' }
    if (knownSum !== 100) return { error: `A complete allocation must total exactly 100% (currently ${knownSum}).` }
  }
  return {}
}

function replaceInterests(
  db: MockDb,
  scopeTable: string,
  scopeKey: string,
  scopeId: string,
  ownerKey: string,
  versionsTable: string,
  versionsKey: string,
  correctionsTable: string,
  summaryTable: string,
  summaryKey: string,
  args: Record<string, unknown>,
  ownerRefLookup: (id: string) => MockRow,
) {
  const entries = args.p_entries as Entry[]
  const reason = args.p_reason as string
  const expectedVersion = args.p_expected_version as number
  const allocationStatus = (args.p_allocation_status as string) ?? 'incomplete'

  if (!reason || !reason.trim()) {
    return { data: null, error: { message: 'A reason is required for every ownership change.', code: 'ZM003' } }
  }

  // account_id must be stamped on every inserted row — a real query
  // filters by it (.eq('account_id', accountId)), and a row missing it
  // would silently vanish from every subsequent read in this mock.
  const scopeAccountId =
    (db.properties.find((p) => p.id === scopeId)?.account_id as string | undefined) ??
    (db.llcs.find((l) => l.id === scopeId)?.account_id as string | undefined) ??
    ''

  const { error: validationError } = validate(entries, allocationStatus)
  if (validationError) return { data: null, error: { message: validationError, code: 'ZM003' } }

  if (!db[versionsTable]) db[versionsTable] = []
  let versionRow = db[versionsTable].find((r) => r[versionsKey] === scopeId)
  if (!versionRow) {
    versionRow = { [versionsKey]: scopeId, version: 0, allocation_status: 'incomplete' }
    db[versionsTable].push(versionRow)
  }
  if ((versionRow.version as number) !== expectedVersion) {
    return { data: null, error: { message: 'Ownership data has changed since you loaded it. Refresh and try again.', code: 'ZM001' } }
  }

  if (!db[correctionsTable]) db[correctionsTable] = []
  const current = db[scopeTable].filter((r) => r[scopeKey] === scopeId && r.is_current)
  const newIds = new Set(entries.map((e) => e.owner_id))

  for (const old of current) {
    if (!newIds.has(old[ownerKey] as string)) {
      old.is_current = false
      old.end_date = new Date().toISOString().slice(0, 10)
      db[correctionsTable].push({
        id: `mock-${Math.random().toString(36).slice(2)}`,
        account_id: scopeAccountId,
        [scopeKey]: scopeId,
        [ownerKey]: old[ownerKey],
        change_type: 'removed',
        previous_percentage: old.percentage,
        new_percentage: null,
        reason,
        corrected_at: new Date().toISOString(),
      })
    }
  }

  for (const entry of entries) {
    const old = current.find((r) => r[ownerKey] === entry.owner_id && r.is_current)
    if (!old) {
      const newRow: MockRow = {
        id: `mock-${Math.random().toString(36).slice(2)}`,
        account_id: scopeAccountId,
        [scopeKey]: scopeId,
        [ownerKey]: entry.owner_id,
        percentage: entry.percentage,
        effective_date: entry.effective_date,
        end_date: null,
        is_current: true,
        recorded_at: new Date().toISOString(),
      }
      if (ownerKey === 'llc_id' && scopeTable === 'property_ownership_interests') newRow.owner_name = ownerRefLookup(entry.owner_id)
      if (ownerKey === 'member_llc_id') newRow.member_name = ownerRefLookup(entry.owner_id)
      db[scopeTable].push(newRow)
      db[correctionsTable].push({
        id: `mock-${Math.random().toString(36).slice(2)}`,
        account_id: scopeAccountId,
        [scopeKey]: scopeId,
        [ownerKey]: entry.owner_id,
        change_type: 'added',
        previous_percentage: null,
        new_percentage: entry.percentage,
        reason,
        corrected_at: new Date().toISOString(),
      })
    } else if (old.percentage !== entry.percentage) {
      old.is_current = false
      old.end_date = entry.effective_date ?? new Date().toISOString().slice(0, 10)
      const newRow: MockRow = {
        id: `mock-${Math.random().toString(36).slice(2)}`,
        account_id: scopeAccountId,
        [scopeKey]: scopeId,
        [ownerKey]: entry.owner_id,
        percentage: entry.percentage,
        effective_date: entry.effective_date ?? old.effective_date,
        end_date: null,
        is_current: true,
        superseded_by_id: null,
        recorded_at: new Date().toISOString(),
      }
      if (ownerKey === 'llc_id' && scopeTable === 'property_ownership_interests') newRow.owner_name = ownerRefLookup(entry.owner_id)
      if (ownerKey === 'member_llc_id') newRow.member_name = ownerRefLookup(entry.owner_id)
      db[scopeTable].push(newRow)
      old.superseded_by_id = newRow.id
      db[correctionsTable].push({
        id: `mock-${Math.random().toString(36).slice(2)}`,
        [scopeKey]: scopeId,
        [ownerKey]: entry.owner_id,
        change_type: 'percentage_changed',
        previous_percentage: old.percentage,
        new_percentage: entry.percentage,
        reason,
        corrected_at: new Date().toISOString(),
      })
    }
  }

  versionRow.version = (versionRow.version as number) + 1
  versionRow.allocation_status = allocationStatus

  const nowCurrent = db[scopeTable].filter((r) => r[scopeKey] === scopeId && r.is_current)
  if (!db[summaryTable]) db[summaryTable] = []
  let summaryRow = db[summaryTable].find((r) => r[summaryKey] === scopeId)
  if (!summaryRow) {
    summaryRow = { [summaryKey]: scopeId, account_id: scopeAccountId }
    db[summaryTable].push(summaryRow)
  }
  const knownTotal = nowCurrent.reduce((sum, r) => sum + ((r.percentage as number) ?? 0), 0)
  Object.assign(summaryRow, {
    owner_count: nowCurrent.length,
    member_count: nowCurrent.length,
    owners_with_percentage: nowCurrent.filter((r) => r.percentage !== null).length,
    members_with_percentage: nowCurrent.filter((r) => r.percentage !== null).length,
    percentage_total: nowCurrent.length ? knownTotal : null,
    completeness: nowCurrent.length === 0 ? 'none' : allocationStatus,
  })

  return { data: versionRow.version, error: null }
}

export function createMockRpcHandlers(db: MockDb) {
  const lookupLlc = (id: string) => {
    const llc = db.llcs.find((l) => l.id === id)
    return { display_name: (llc?.display_name as string | null) ?? null, name: (llc?.name as string) ?? 'Unknown' }
  }

  return {
    replace_property_ownership_interests: (args: Record<string, unknown>) =>
      replaceInterests(
        db,
        'property_ownership_interests',
        'property_id',
        args.p_property_id as string,
        'llc_id',
        'property_ownership_versions',
        'property_id',
        'property_ownership_corrections',
        'property_ownership_summary',
        'property_id',
        args,
        lookupLlc,
      ),
    replace_llc_membership_interests: (args: Record<string, unknown>) =>
      replaceInterests(
        db,
        'llc_membership_interests',
        'llc_id',
        args.p_llc_id as string,
        'member_llc_id',
        'llc_membership_versions',
        'llc_id',
        'llc_membership_corrections',
        'llc_membership_summary',
        'llc_id',
        args,
        lookupLlc,
      ),
  }
}
