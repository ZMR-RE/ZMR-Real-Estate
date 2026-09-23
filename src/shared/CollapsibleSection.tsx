import type { ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
  // A control that belongs at the box's header level (e.g. Financial
  // accounts' "Show archived" toggle) rather than inside the body, where
  // it would only be visible when expanded and would add a vertical row
  // instead of sitting inline with the title. Rendered right-aligned in
  // the summary row, stopping click/keydown propagation so interacting
  // with it doesn't also toggle the box open/closed.
  headerActions?: ReactNode
}

// Native <details>/<summary> — no state management needed, works without
// JS-heavy machinery, and is accessible by default. Roadmap 7.10/7.13/7.14
// all ask for "collapsible boxes"; this is the one shared implementation
// every one of them uses instead of each rolling its own.
// Roadmap 7.41 — reverts 7.39 (5)'s persistent expanded-state tint.
// shared/cardTint.ts's 4-color hash palette was built to distinguish
// different PROPERTIES on the Registry list; reusing it here to mean
// "this box is open" was the wrong tool for the job. Replaced with a
// single, uniform navy hover tint on the whole box (index.css), same
// idea as item 6's approved hover-only behavior — no persistent state,
// no per-box color variation.
export function CollapsibleSection({ title, defaultOpen = false, children, headerActions }: CollapsibleSectionProps) {
  return (
    <details className="collapsible-section" open={defaultOpen}>
      <summary>
        <span className="collapsible-section-title">{title}</span>
        {headerActions && (
          <span
            className="collapsible-section-header-actions"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {headerActions}
          </span>
        )}
      </summary>
      <div className="collapsible-section-body">{children}</div>
    </details>
  )
}
