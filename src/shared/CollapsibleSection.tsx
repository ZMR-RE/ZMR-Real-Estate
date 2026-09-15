import type { ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

// Native <details>/<summary> — no state management needed, works without
// JS-heavy machinery, and is accessible by default. Roadmap 7.10/7.13/7.14
// all ask for "collapsible boxes"; this is the one shared implementation
// every one of them uses instead of each rolling its own.
export function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  return (
    <details className="collapsible-section" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="collapsible-section-body">{children}</div>
    </details>
  )
}
