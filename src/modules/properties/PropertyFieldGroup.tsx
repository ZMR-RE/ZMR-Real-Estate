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
  onAddFields: (fieldKeys: string[]) => void
}

// Roadmap 7.22 — a labeled sub-section within Property information.
// Fields with a real value render normally; fields without one never
// show individually as "—" — they collapse into a single "+ Add …"
// prompt so a mostly-empty property doesn't read as a wall of dashes.
export function PropertyFieldGroup({ title, presentFields, missingFields, onAddFields }: PropertyFieldGroupProps) {
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
        <button
          type="button"
          className="property-field-group-add-prompt"
          onClick={() => onAddFields(missingFields.map((field) => field.key))}
        >
          + Add {missingFields.map((field) => field.label).join(', ')}
        </button>
      )}
    </section>
  )
}
