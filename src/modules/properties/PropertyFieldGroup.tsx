import type { ComponentType, ReactNode } from 'react'

interface PresentField {
  label: string
  value: ReactNode
}

interface PropertyFieldGroupProps {
  title: string
  Icon: ComponentType
  presentFields: PresentField[]
  // Roadmap 7.44 — Nested subsection visual hierarchy: a general
  // modifier any group can opt into, not specific to this one caller.
  nested?: boolean
}

// Roadmap 7.22 — a labeled sub-section within Property information.
//
// CLAUDE.md's Empty field visibility rule (roadmap 7.33) — fields
// without a value are omitted entirely in this view-only state, no
// placeholder of any kind (this used to collapse them into a single
// "+ Add …" hint chip; that chip is gone, not just hidden). Edit mode
// (PropertyForm) is unaffected — it always shows every field. A group
// with zero present fields renders nothing at all (see PropertySummary,
// which filters those out before this component is reached) rather than
// a bare title over an empty body.
// Roadmap 7.35 (5) — small icon next to the title, currentColor so it
// follows the title's own accent color automatically.
export function PropertyFieldGroup({ title, Icon, presentFields, nested = false }: PropertyFieldGroupProps) {
  return (
    <section className="property-field-group">
      <h3 className={`property-field-group-title${nested ? ' property-field-group-title--nested' : ''}`}>
        <Icon />
        {title}
      </h3>
      <dl className="field-grid">
        {presentFields.map((field) => (
          <div className="field" key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
