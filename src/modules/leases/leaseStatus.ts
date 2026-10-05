// A lease's status from its dates. Computed, not stored — same "real-time
// check, not a snapshot" approach as Insurance's getInsuranceStatus
// (insuranceQueries.ts). No cron/scheduled-function infrastructure exists
// in this codebase to keep a stored status column in sync as calendar
// time passes with no write happening, so a stored column would go stale.
// Pure (no Supabase), so pure logic files can share the one rule.
export type LeaseStatus = 'upcoming' | 'active' | 'ended'

export function getLeaseStatus(
  lease: { start_date: string; end_date: string | null },
  today: string = new Date().toISOString().slice(0, 10),
): LeaseStatus {
  if (lease.start_date > today) return 'upcoming'
  if (lease.end_date !== null && lease.end_date < today) return 'ended'
  return 'active'
}
