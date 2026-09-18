import type { ReactNode } from 'react'

interface TitledSectionProps {
  title: string
  children: ReactNode
}

// A titled box without a collapse toggle — for content that should stay
// always visible (Property Overview's "Property information" block,
// view-by-default per roadmap 7.7). Styled to match CollapsibleSection's
// box so a screen mixing this with collapsible sections still reads as
// one consistent set of boxes.
export function TitledSection({ title, children }: TitledSectionProps) {
  return (
    <section className="titled-section">
      <h2 className="titled-section-title">{title}</h2>
      <div className="titled-section-body">{children}</div>
    </section>
  )
}
