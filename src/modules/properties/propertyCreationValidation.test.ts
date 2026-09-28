import { describe, expect, it } from 'vitest'
import { validateWizardOwnershipEntries } from './propertyCreationValidation'
import type { WizardOwnershipEntry } from './propertyCreationQueries'

describe('validateWizardOwnershipEntries', () => {
  it('accepts zero owners marked incomplete (the empty-account default state)', () => {
    expect(validateWizardOwnershipEntries([], 'incomplete')).toEqual({ valid: true })
  })

  it('rejects zero owners marked complete', () => {
    const result = validateWizardOwnershipEntries([], 'complete')
    expect(result.valid).toBe(false)
  })

  it('accepts one existing owner at 55%, marked incomplete', () => {
    const entries: WizardOwnershipEntry[] = [{ ownerId: 'a', percentage: 55, effectiveDate: null }]
    expect(validateWizardOwnershipEntries(entries, 'incomplete')).toEqual({ valid: true })
  })

  it('accepts an existing owner and a brand-new owner together, summing to 100, marked complete', () => {
    const entries: WizardOwnershipEntry[] = [
      { ownerId: 'a', percentage: 55, effectiveDate: null },
      { newOwnerName: 'ZMR-TEST New Owner LLC', ownerKind: 'entity', percentage: 45, effectiveDate: null },
    ]
    expect(validateWizardOwnershipEntries(entries, 'complete')).toEqual({ valid: true })
  })

  it('accepts a brand-new owner with an unknown percentage, marked incomplete', () => {
    const entries: WizardOwnershipEntry[] = [{ newOwnerName: 'ZMR-TEST New Owner LLC', ownerKind: null, percentage: null, effectiveDate: null }]
    expect(validateWizardOwnershipEntries(entries, 'incomplete')).toEqual({ valid: true })
  })

  it('rejects a new-owner entry with a blank name', () => {
    const entries: WizardOwnershipEntry[] = [{ newOwnerName: '   ', ownerKind: null, percentage: 50, effectiveDate: null }]
    const result = validateWizardOwnershipEntries(entries, 'incomplete')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/name/)
  })

  it('rejects marking complete when a new owner has no percentage yet', () => {
    const entries: WizardOwnershipEntry[] = [{ newOwnerName: 'ZMR-TEST New Owner LLC', ownerKind: 'individual', percentage: null, effectiveDate: null }]
    const result = validateWizardOwnershipEntries(entries, 'complete')
    expect(result.valid).toBe(false)
  })

  it('rejects known percentages exceeding 100 across a mix of existing and new owners', () => {
    const entries: WizardOwnershipEntry[] = [
      { ownerId: 'a', percentage: 70, effectiveDate: null },
      { newOwnerName: 'ZMR-TEST New Owner LLC', ownerKind: 'entity', percentage: 60, effectiveDate: null },
    ]
    expect(validateWizardOwnershipEntries(entries, 'incomplete').valid).toBe(false)
  })
})
