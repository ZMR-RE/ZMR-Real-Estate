// Roadmap 8.6 — address is the canonical identifier for a property across
// the app (search, dropdowns, headers), superseding the free-text name
// field. Centralized here so every module falls back the same way if a
// property somehow has no address on file, rather than each caller
// re-deciding that independently.
export interface PropertyRef {
  // Package 1 — no longer required at creation; address is the real
  // identifier. A property can now genuinely have neither.
  name: string | null
  address: string | null
}

export function propertyLabel(property: PropertyRef | null | undefined): string {
  if (!property) return '—'
  return property.address ?? property.name ?? '—'
}
