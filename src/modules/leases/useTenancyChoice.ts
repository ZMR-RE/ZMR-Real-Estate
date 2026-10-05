import { useState } from 'react'
import { unfinishedLeases } from './leaseFormLogic'
import { getLeaseStatus, type Lease } from './leasesQueries'

// What the owner is adding to a unit, chosen explicitly when the unit
// already has a tenancy (or an unfinished one): a separate tenancy with its
// own rent, co-tenants on an existing tenancy (its rent unchanged), or
// finishing an unfinished tenancy by its ID.
export type TenancyChoice = { kind: 'new' } | { kind: 'resume'; lease: Lease } | { kind: 'cotenant'; lease: Lease }

// The one choice mechanism both entry points use — Property Overview ›
// Tenants › + Add tenant and Units › + Add lease — so they behave the same.
// `leases` are the unit's saved leases; `pendingLeaseId` is a half-saved
// lease being finished in this form (no choice can change meanwhile).
export function useTenancyChoice(leases: Lease[], loaded: boolean, pendingLeaseId: string | null) {
  const [choice, setChoice] = useState<TenancyChoice | null>(null)
  const [unfinishedSkipped, setUnfinishedSkipped] = useState(false)

  const unfinished = unfinishedLeases(leases)
  const current = leases.filter((l) => !l.archived && l.tenants.length > 0 && getLeaseStatus(l) !== 'ended')
  const open = loaded && choice === null && pendingLeaseId === null
  const needsUnfinishedChoice = open && unfinished.length > 0 && !unfinishedSkipped
  const needsKindChoice = open && !needsUnfinishedChoice && current.length > 0
  // Nothing to choose between: a plain new tenancy.
  const effective: TenancyChoice | null = choice ?? (loaded && !needsUnfinishedChoice && !needsKindChoice ? { kind: 'new' } : null)

  const reset = () => {
    setChoice(null)
    setUnfinishedSkipped(false)
  }

  return {
    unfinished,
    current,
    needsUnfinishedChoice,
    needsKindChoice,
    choice: effective,
    choose: setChoice,
    skipUnfinished: () => setUnfinishedSkipped(true),
    reset,
    // Back to the choices — not while a half-saved lease is being finished.
    canChange: pendingLeaseId === null && (unfinished.length > 0 || current.length > 0),
  }
}

export type TenancyChoiceState = ReturnType<typeof useTenancyChoice>
