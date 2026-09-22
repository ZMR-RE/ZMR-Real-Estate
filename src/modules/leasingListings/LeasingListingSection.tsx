import { useLeasingListings } from './useLeasingListings'
import { LeasingListingForm } from './LeasingListingForm'
import { LeasingListingList } from './LeasingListingList'

interface LeasingListingSectionProps {
  propertyId: string
  unitId: string
  title?: string
  headingLevel?: 'h2' | 'h4'
}

const BLANK_LISTING = { platform: '', date_posted: new Date().toISOString().slice(0, 10), notes: null }

// Roadmap 7.3 — per-unit leasing/listing tracker: platform posted to,
// date posted, days live (calculated), prospective tenant notes. Nested
// inside a Unit card on the Overview tab, same composition 7.4's
// PropertySpecsSection already uses there, scoped to that unit's id.
//
// title/headingLevel work exactly like PropertySpecsSection's: omit
// title when this is already wrapped in its own titled CollapsibleSection
// (roadmap 7.22 treatment applied to each unit's nested sections) to
// avoid a redundant repeated heading.
export function LeasingListingSection({
  propertyId,
  unitId,
  title,
  headingLevel = 'h4',
}: LeasingListingSectionProps) {
  const { listings, loading, error, isAdding, editingId, saving, startAdding, startEditing, cancelForm, add, save } =
    useLeasingListings(propertyId, unitId)
  const Heading = headingLevel

  return (
    <section>
      {title && <Heading>{title}</Heading>}
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <LeasingListingList
          listings={listings}
          editingId={editingId}
          saving={saving}
          onStartEditing={startEditing}
          onSave={save}
          onCancel={cancelForm}
        />
      )}

      {isAdding ? (
        <LeasingListingForm initialValues={BLANK_LISTING} saving={saving} onSave={add} onCancel={cancelForm} />
      ) : (
        <button type="button" onClick={startAdding}>
          + Add listing
        </button>
      )}
    </section>
  )
}
