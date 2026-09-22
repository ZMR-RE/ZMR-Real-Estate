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
