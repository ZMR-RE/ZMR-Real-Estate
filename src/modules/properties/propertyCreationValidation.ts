import { validateOwnershipEntriesClientSide, type AllocationStatus } from '../llcs/ownershipInterestsQueries'
import type { WizardOwnershipEntry } from './propertyCreationQueries'

// Package 1 — pure validation for the creation wizard's Ownership step.
// Mirrors validateOwnershipEntriesClientSide's rules (itself a mirror of
// the server's _validate_ownership_entries) but accepts the wizard's
// richer entry shape, which can name a brand-new owner instead of
// referencing an existing one. NOT the authoritative check — the server
// re-validates everything inside create_property_with_ownership
// regardless of what this function already confirmed.
export interface WizardValidationResult {
  valid: boolean
  error?: string
}

export function validateWizardOwnershipEntries(entries: WizardOwnershipEntry[], allocationStatus: AllocationStatus): WizardValidationResult {
  for (const entry of entries) {
    if ('newOwnerName' in entry && entry.newOwnerName !== undefined) {
      if (entry.newOwnerName.trim() === '') {
        return { valid: false, error: 'A new owner needs a name before it can be saved.' }
      }
    }
  }

  // Every entry (existing or new) gets a stable synthetic id here purely
  // so the shared duplicate/percentage-sum/completeness rules can run
  // unchanged — a new owner's real id doesn't exist yet (it's minted by
  // the server inside the same transaction as everything else), so
  // there is nothing else this function could use as a key.
  const asOwnershipInput = entries.map((entry, index) => ({
    ownerId: 'ownerId' in entry && entry.ownerId !== undefined ? entry.ownerId : `__new_owner_${index}`,
    percentage: entry.percentage,
  }))

  return validateOwnershipEntriesClientSide(asOwnershipInput, allocationStatus)
}
