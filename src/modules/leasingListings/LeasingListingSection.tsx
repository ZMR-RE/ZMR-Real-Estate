import { useLeasingListings } from './useLeasingListings'
import { LeasingListingForm } from './LeasingListingForm'
import { LeasingListingList } from './LeasingListingList'
import { EditableSection } from '../../shared/EditableSection'

interface LeasingListingSectionProps {
  propertyId: string
  unitId: string
}

const BLANK_LISTING = { platform: '', date_posted: new Date().toISOString().slice(0, 10), notes: null }

// Roadmap 7.3 — per-unit leasing/listing tracker: platform posted to,
// date posted, days live (calculated), prospective tenant notes. Nested
// inside a Unit card on the Overview tab, same composition 7.4's
// PropertySpecsSection already uses there, scoped to that unit's id.
//
// Roadmap 7.28 — converted to the Box interaction standard's
// EditableSection, owning its own box (title, chevron, Edit) rather
// than being wrapped by the caller's own CollapsibleSection — same fix
// as Utility records (7.25): a caller-side wrapper would double-box
// this now that it renders its own. View state shows a read-only list,
// no per-row Edit and no standing "+ Add listing" button; both only
// appear once this box's own Edit is clicked.
export function LeasingListingSection({ propertyId, unitId }: LeasingListingSectionProps) {
  const { listings, loading, error, isAdding, editingId, saving, startAdding, startEditing, cancelForm, add, save } =
    useLeasingListings(propertyId, unitId)

  return (
    <EditableSection
      title="Leasing / listing history"
      onEditStart={cancelForm}
      view={
        <>
          {error && <p role="alert">{error}</p>}
          {loading ? (
            <p>Loading…</p>
          ) : (
            <LeasingListingList
              listings={listings}
              readOnly
              editingId={null}
              saving={saving}
              onStartEditing={() => {}}
              onSave={() => {}}
              onCancel={() => {}}
            />
          )}
        </>
      }
      edit={(exitEditing) => (
        <>
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

          <button type="button" onClick={exitEditing}>
            Done
          </button>
        </>
      )}
    />
  )
}
