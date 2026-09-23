import { supabase } from '../../shared/supabaseClient'

const RENEWAL_WINDOW_DAYS = 60

interface LeaseForReminder {
  id: string
  property_id: string
  unit_id: string
  end_date: string | null
  unit: { unit_label: string } | null
  lease_tenants: { tenant: { name: string } | null }[]
}

// Roadmap "Units/Lease/Tenant rebuild" item 6 — a lease within 60 days
// of its end date auto-generates a renewal-reminder action item, linked
// back to the lease.
//
// This codebase has no cron/scheduled-function infrastructure anywhere
// (confirmed before building this — no pg_cron, no Edge Functions; the
// only existing "N days before X" pattern, Insurance expiration, is
// purely client-side/render-time, never a stored/generated row). Per
// explicit user sign-off, this is implemented as an idempotent check-
// and-backfill: called from page loads (Action Queue, a property's own
// Units box) rather than firing the instant a lease crosses the 60-day
// mark. A reminder is created at most once per lease — checked by
// lease_id, regardless of completed state — and editing a lease's
// end_date later does NOT regenerate/move an existing reminder (an
// accepted limitation, also confirmed); the expected renewal flow is
// ending the old lease and starting a fresh one, which naturally gets
// its own fresh reminder cycle.
export async function ensureLeaseRenewalReminders(accountId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const windowEnd = new Date()
  windowEnd.setDate(windowEnd.getDate() + RENEWAL_WINDOW_DAYS)
  const windowEndStr = windowEnd.toISOString().slice(0, 10)

  const { data: leases, error: leasesError } = await supabase
    .from('leases')
    .select('id, property_id, unit_id, end_date, unit:units(unit_label), lease_tenants(tenant:tenants(name))')
    .eq('account_id', accountId)
    .eq('archived', false)
    .not('end_date', 'is', null)
    .gte('end_date', today)
    .lte('end_date', windowEndStr)
    .returns<LeaseForReminder[]>()

  if (leasesError || !leases || leases.length === 0) return

  const { data: existingReminders } = await supabase
    .from('action_items')
    .select('lease_id')
    .eq('account_id', accountId)
    .in(
      'lease_id',
      leases.map((l) => l.id),
    )
    .returns<{ lease_id: string | null }[]>()

  const alreadyReminded = new Set((existingReminders ?? []).map((r) => r.lease_id))
  const toCreate = leases.filter((lease) => !alreadyReminded.has(lease.id))

  if (toCreate.length === 0) return

  await supabase.from('action_items').insert(
    toCreate.map((lease) => {
      const tenantNames = lease.lease_tenants.map((lt) => lt.tenant?.name).filter(Boolean).join(', ')
      const unitLabel = lease.unit?.unit_label ?? 'unit'
      return {
        account_id: accountId,
        property_id: lease.property_id,
        unit_id: lease.unit_id,
        lease_id: lease.id,
        type: 'Lease renewal',
        title: `Renew lease — ${unitLabel}${tenantNames ? ` (${tenantNames})` : ''}`,
        due_date: lease.end_date,
        source_label: 'Auto-generated: lease renewal',
      }
    }),
  )
}
