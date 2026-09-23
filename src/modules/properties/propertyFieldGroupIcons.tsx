// Roadmap 7.35 (5) — small icons next to each Property Information
// section title. Plain hand-rolled inline SVGs (stroke, currentColor,
// 24x24 viewBox), same convention PropertyPhoto.tsx's PlaceholderIcon
// already established — no icon library exists in this app, and one
// icon per group doesn't justify adding one. currentColor means each
// icon automatically follows .property-field-group-title's own accent
// color (Section hierarchy contrast rule) rather than needing its own
// color rule.
export function PurchaseValuationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M14.5 9.5c0-1.1-1.1-2-2.5-2s-2.5.7-2.5 1.8c0 1.1.9 1.5 2.5 2s2.5.9 2.5 2c0 1.1-1.1 1.7-2.5 1.7S9 15.6 9 14.5" />
    </svg>
  )
}

export function PhysicalFactsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function ExteriorInformationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 10h16M4 16h16M10 4v16" />
    </svg>
  )
}

// Roadmap 7.38 (1) — Physical facts headline stat cards (Bedrooms/
// Bathrooms/Living area/Year built). Same hand-rolled stroke/
// currentColor convention as above, one notch smaller in stroke width
// (1.25 vs 1.5) since these sit at a smaller rendered size next to a
// large bold number, not next to a section title.
export function BedroomsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <path d="M3 19v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
      <path d="M3 19v2M21 19v2M3 14h18" />
      <path d="M6 14v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function BathroomsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z" />
      <path d="M6 12V6a2 2 0 0 1 3.4-1.4" />
      <path d="M3 19h18" />
    </svg>
  )
}

export function LivingAreaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 9h3v3H4zM4 9V4M7 4v5" />
    </svg>
  )
}

export function YearBuiltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}
