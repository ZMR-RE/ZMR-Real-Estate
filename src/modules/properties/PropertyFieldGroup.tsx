import type { ReactNode } from 'react'

interface PresentField {
  label: string
  value: ReactNode
}

interface MissingField {
  key: string
  label: string
}

interface PropertyFieldGroupProps {
  title: string
  presentFields: PresentField[]
  missingFields: MissingField[]
}

// Roadmap 7.22 — a labeled sub-section within Property information.
// Fields with a real value render normally; fields without one never
// show individually as "—" — they collapse into a single "+ Add …"
// hint so a mostly-empty property doesn't read as a wall of dashes.
// The hint used to be a button that jumped straight into edit mode with
// that field focused; the Box interaction standard's single top-right
// Edit action (now via EditableSection, see PropertyProfileOverviewTab)
// is the only entry point into editing, so this is plain text now —
// still tells the user what's missing, just doesn't offer a second way
// in.
export function PropertyFieldGroup({ title, presentFields, missingFields }: PropertyFieldGroupProps) {
  return (
    <section className="property-field-group">
      <h3 className="property-field-group-title">{title}</h3>
      {presentFields.length > 0 && (
        <dl className="field-grid">
          {presentFields.map((field) => (
            <div className="field" key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {missingFields.length > 0 && (
        <p className="property-field-group-add-prompt">
          + Add {missingFields.map((field) => field.label).join(', ')}
        </p>
      )}
    </section>
  )
}
