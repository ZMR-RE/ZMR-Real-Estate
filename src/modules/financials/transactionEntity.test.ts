import { describe, expect, it } from 'vitest'
import { canSuggest, entityPickerOptions, needsEntityByYear, showSuggestion, suggestionFromLookup } from './transactionEntity'
import { blankTransaction, nextEntryDraft, transactionToInput } from './transactionEntry'
import { M5_TRANSACTIONS } from './m5Ledger.fixture'

const E1 = { id: 'e1', name: 'ZMR-TEST E1 LLC', archived: false }
const E2 = { id: 'e2', name: 'ZMR-TEST E2 LLC', archived: true }

describe('responsible entity suggestion', () => {
  it('needs a property and a complete date before looking anything up', () => {
    expect(canSuggest('', '2025-05-01')).toBe(false)
    expect(canSuggest('p1', '2025-05')).toBe(false)
    expect(canSuggest('p1', '2025-05-01')).toBe(true)
  })

  it('names the suggested entity, or reports none', () => {
    expect(suggestionFromLookup('e1', [E1])).toEqual({ kind: 'suggested', entityId: 'e1', entityName: 'ZMR-TEST E1 LLC' })
    expect(suggestionFromLookup(null, [E1])).toEqual({ kind: 'unresolved' })
  })

  it('never offers an entity it cannot name', () => {
    expect(suggestionFromLookup('e9', [E1])).toEqual({ kind: 'unresolved' })
  })

  it('is shown only while it would change the field', () => {
    const suggested = suggestionFromLookup('e1', [E1])
    expect(showSuggestion(suggested, null)).toBe(true)
    expect(showSuggestion(suggested, 'e2')).toBe(true)
    expect(showSuggestion(suggested, 'e1')).toBe(false)
    expect(showSuggestion({ kind: 'unresolved' }, null)).toBe(false)
  })
})

describe('entity picker', () => {
  it('lists active entities and keeps an archived one only when it is the stored value', () => {
    expect(entityPickerOptions([E1, E2], null)).toEqual([{ id: 'e1', label: 'ZMR-TEST E1 LLC' }])
    expect(entityPickerOptions([E1, E2], 'e2')).toEqual([
      { id: 'e1', label: 'ZMR-TEST E1 LLC' },
      { id: 'e2', label: 'ZMR-TEST E2 LLC (archived)' },
    ])
  })
})

describe('entry drafts never fill the entity in', () => {
  it('starts blank', () => {
    expect(blankTransaction('2025-05-01').responsibleEntityId).toBeNull()
  })

  it('is not carried into "Save and add another"', () => {
    expect(nextEntryDraft({ ...blankTransaction('2025-05-01'), propertyId: 'p1', responsibleEntityId: 'e1' }).responsibleEntityId).toBeNull()
  })

  it('an edit starts from the stored entity, or none', () => {
    const tx = M5_TRANSACTIONS[0]
    expect(transactionToInput({ ...tx, responsible_entity: { id: 'e1', name: 'ZMR-TEST E1 LLC' } }).responsibleEntityId).toBe('e1')
    expect(transactionToInput({ ...tx, responsible_entity: null }).responsibleEntityId).toBeNull()
  })
})

describe('Needs-entity counts', () => {
  it('groups by year, newest first', () => {
    expect(
      needsEntityByYear([{ transaction_date: '2025-03-01' }, { transaction_date: '2026-01-02' }, { transaction_date: '2025-12-31' }]),
    ).toEqual([
      { year: 2026, count: 1 },
      { year: 2025, count: 2 },
    ])
    expect(needsEntityByYear([])).toEqual([])
  })
})
