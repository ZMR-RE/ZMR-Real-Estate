import type { EntityOption } from './transactionEntityQueries'

// Pure rules for the responsible-entity field and the Needs-entity list,
// separate from React so they can be tested directly.

export type EntitySuggestion =
  // Nothing to look up yet (no property, or the date isn't complete).
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'suggested'; entityId: string; entityName: string }
  // Looked up: shared, partial, undated or unrecorded ownership.
  | { kind: 'unresolved' }
  | { kind: 'failed'; message: string }

export function canSuggest(propertyId: string, transactionDate: string): boolean {
  return propertyId !== '' && /^\d{4}-\d{2}-\d{2}$/.test(transactionDate)
}

export function suggestionFromLookup(entityId: string | null, options: EntityOption[]): EntitySuggestion {
  if (!entityId) return { kind: 'unresolved' }
  const option = options.find((o) => o.id === entityId)
  // The suggested entity isn't in the loaded list (e.g. still loading):
  // never offer a choice the owner can't see named.
  return option ? { kind: 'suggested', entityId, entityName: option.name } : { kind: 'unresolved' }
}

// The suggestion is only worth showing while it would change something.
export function showSuggestion(suggestion: EntitySuggestion, currentEntityId: string | null): boolean {
  return suggestion.kind === 'suggested' && suggestion.entityId !== currentEntityId
}

// Picker choices: active entities, plus the currently chosen one even if
// it has since been archived, so an older transaction still shows its
// stored value instead of a blank.
export function entityPickerOptions(options: EntityOption[], currentEntityId: string | null) {
  return options
    .filter((o) => !o.archived || o.id === currentEntityId)
    .map((o) => ({ id: o.id, label: o.archived ? `${o.name} (archived)` : o.name }))
}

export interface NeedsEntityYear {
  year: number
  count: number
  // The year is locked: it must be reopened before any entity is assigned.
  locked: boolean
}

// Needs-entity counts per year, newest year first, marking locked years.
export function needsEntityByYear(dates: { transaction_date: string }[], lockedYears: number[] = []): NeedsEntityYear[] {
  const counts = new Map<number, number>()
  for (const { transaction_date } of dates) {
    const year = Number(transaction_date.slice(0, 4))
    counts.set(year, (counts.get(year) ?? 0) + 1)
  }
  const locked = new Set(lockedYears)
  return [...counts.entries()].sort((a, b) => b[0] - a[0]).map(([year, count]) => ({ year, count, locked: locked.has(year) }))
}
