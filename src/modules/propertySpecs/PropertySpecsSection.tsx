import { usePropertySpecs } from './usePropertySpecs'
import { PropertySpecForm } from './PropertySpecForm'
import { PropertySpecList } from './PropertySpecList'

interface PropertySpecsSectionProps {
  propertyId: string
}

const BLANK_SPEC = { label: '', value: '' }

// Roadmap 7.4 — free-form key-value specs/measurements log, embedded on
// the Overview tab for now since 7.9's dedicated tab restructure (which
// would give this its own collapsible box) hasn't landed yet.
export function PropertySpecsSection({ propertyId }: PropertySpecsSectionProps) {
  const { specs, loading, error, isAdding, editingId, saving, startAdding, startEditing, cancelForm, add, save } =
    usePropertySpecs(propertyId)

  return (
    <section>
      <h2>Specs &amp; measurements</h2>
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
