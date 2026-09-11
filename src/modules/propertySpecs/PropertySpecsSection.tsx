import { usePropertySpecs } from './usePropertySpecs'
import { PropertySpecForm } from './PropertySpecForm'
import { PropertySpecList } from './PropertySpecList'

interface PropertySpecsSectionProps {
  propertyId: string
  unitId?: string | null
  title?: string
  headingLevel?: 'h2' | 'h4'
}

const BLANK_SPEC = { label: '', value: '' }

// Roadmap 7.4 — free-form key-value specs/measurements log, embedded on
// the Overview tab for now since 7.9's dedicated tab restructure (which
// would give this its own collapsible box) hasn't landed yet. Roadmap 7.2
// wired unit_id through: pass unitId to scope this instance to one unit
// instead of the property as a whole (used nested inside a Unit card).
export function PropertySpecsSection({
  propertyId,
  unitId = null,
  title = 'Specs & measurements',
  headingLevel = 'h2',
}: PropertySpecsSectionProps) {
  const { specs, loading, error, isAdding, editingId, saving, startAdding, startEditing, cancelForm, add, save } =
    usePropertySpecs(propertyId, unitId)
  const Heading = headingLevel

  return (
    <section>
      <Heading>{title}</Heading>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <PropertySpecList
          specs={specs}
          editingId={editingId}
          saving={saving}
          onStartEditing={startEditing}
          onSave={save}
          onCancel={cancelForm}
        />
      )}

      {isAdding ? (
        <PropertySpecForm initialValues={BLANK_SPEC} saving={saving} onSave={add} onCancel={cancelForm} />
      ) : (
        <button type="button" onClick={startAdding}>
          + Add spec
        </button>
      )}
    </section>
  )
}
