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
