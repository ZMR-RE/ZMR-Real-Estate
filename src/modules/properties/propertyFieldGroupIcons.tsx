// Roadmap 7.35 (5) — small icons next to each Property Information
// section title. Plain hand-rolled inline SVGs (stroke, currentColor,
// 24x24 viewBox), same convention PropertyPhoto.tsx's PlaceholderIcon
// already established — no icon library exists in this app, and one
// icon per group doesn't justify adding one. currentColor means each
// icon automatically follows .property-field-group-title's own accent
// color (Section hierarchy contrast rule) rather than needing its own
// color rule.
// Roadmap 7.45 (2) — replaces the original circle-plus-squiggle icon,
// which read as a generic info-circle at this render size (the $-curve
// inside it was too subtle to land as a dollar sign in practice).
// Receipt silhouette (zigzag bottom edge + itemized lines) instead —
// unambiguous at a glance and doesn't duplicate the literal "$" already
// shown in the Purchase price value right below it.
export function PurchaseValuationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 3h16v14l-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5V3Z" />
      <path d="M7 7.5h10M7 11h10M7 14.5h6" />
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

// Roadmap 7.45 (1) — Ownership sub-list (PropertySummary.tsx/
// PropertyForm.tsx's own "Ownership" heading, roadmap 7.39 (3)) gets
// this icon alongside the same .property-field-group-title bold/accent
// treatment as Physical facts/Exterior information, matching its
// sibling subsections instead of the quieter, icon-less
// .property-details-title it previously shared with Physical facts'
// "Details" sub-list. Simple person silhouette — the content below it
// (Owner name, Contact phone/email, Deed document) is about who owns
// and can be reached about the property.
export function OwnershipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
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

// Roadmap 7.47 — headline stat cards replaced Bedrooms/Bathrooms with
// Units and Occupied/Vacant (investor-focused: how many units, how many
// are rented, not sleeping-room counts). A small building facade with a
// 2x2 grid of doors/windows reads as "multiple units" the way
// PhysicalFactsIcon's single-house silhouette above doesn't.
export function UnitsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M4 12h16" />
      <rect x="7" y="6" width="3" height="3" />
      <rect x="14" y="6" width="3" height="3" />
      <rect x="7" y="15" width="3" height="3" />
      <rect x="14" y="15" width="3" height="3" />
    </svg>
  )
}

// A single door with a keyhole — "someone has a key to this one" reads
// as occupied without reusing OwnershipIcon's person silhouette, which
// already means something else (who owns the property) elsewhere on
// this same screen.
export function OccupancyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <path d="M6 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17" />
      <path d="M4 21h16" />
      <circle cx="14" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}
