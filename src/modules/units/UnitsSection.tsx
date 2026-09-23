import { useUnits } from './useUnits'
import { UnitForm } from './UnitForm'
import { UnitCard } from './UnitCard'
import { EditableSection } from '../../shared/EditableSection'

interface UnitsSectionProps {
  propertyId: string
}

const BLANK_UNIT = { unit_label: '', status: '' }

// Roadmap 7.2 — units as a real entity, replacing the free-text
// properties.unit_config field. Embedded on the Overview tab for now,
// same as Security Deposits, until 7.9's tab restructure lands.
//
// Units/Lease/Tenant rebuild, Stage 5 — each unit card now shows
// Status/current tenant(s)/current rent/lease end date at a glance (no
// click required, roadmap item 1) and gains top-level "+ Add lease"/
// "+ End lease" actions, all in the new UnitCard.tsx (one useLeases
// call per unit — can't call a hook inside a .map() callback, so this
// moved from an inline render function to a real per-unit component).
// A single-unit property's own unit still hides its label entirely
// (7.55 (5)); the moment a real second unit is added, both labels
// reappear.
export function UnitsSection({ propertyId }: UnitsSectionProps) {
  const {
    units,
    archivedCount,
    showArchived,
    setShowArchived,
    loading,
    error,
    isAdding,
    editingId,
    saving,
    startAdding,
    startEditing,
    cancelForm,
    add,
    save,
    toggleArchived,
  } = useUnits(propertyId)

  const showArchivedToggle = archivedCount > 0 && (
    <label htmlFor="units_show_archived">
      <input
        id="units_show_archived"
        type="checkbox"
        checked={showArchived}
        onChange={(e) => setShowArchived(e.target.checked)}
      />
      Show archived ({archivedCount})
    </label>
  )

  // Roadmap item 5 — "Standalone unit" wording lives here (the box's
  // own empty/zero state and "how many units" framing), not on the
  // hidden per-unit label. `units` is already the currently-visible
  // list (archived filtered unless the toggle is on), same basis the
  // merged Units-occupied stat card uses.
  const isSingleUnit = units.length === 1

  return (
    <EditableSection
      title="Units"
      id="units-section"
      secondaryActions={showArchivedToggle}
      onEditStart={cancelForm}
      view={
        <>
          {error && <p role="alert">{error}</p>}
          {loading ? (
            <p>Loading…</p>
          ) : units.length === 0 ? (
            <p className="empty-state">No units yet — add your first one to get the property set up.</p>
          ) : (
            units.map((unit) => (
              <UnitCard
                key={unit.id}
                propertyId={propertyId}
                unit={unit}
                isSingleUnit={isSingleUnit}
                interactive={false}
                unitFormEditing={false}
                saving={saving}
                onStartEditingUnit={startEditing}
                onSaveUnit={save}
                onCancelUnitForm={cancelForm}
                onToggleUnitArchived={toggleArchived}
              />
            ))
          )}
        </>
      }
      edit={(exitEditing) => (
        <>
          {error && <p role="alert">{error}</p>}

          {loading ? (
            <p>Loading…</p>
          ) : units.length === 0 ? (
            <p className="empty-state">No units yet — add your first one to get the property set up.</p>
          ) : (
            units.map((unit) => (
              <UnitCard
                key={unit.id}
                propertyId={propertyId}
                unit={unit}
                isSingleUnit={isSingleUnit}
                interactive
                unitFormEditing={editingId === unit.id}
                saving={saving}
                onStartEditingUnit={startEditing}
                onSaveUnit={save}
                onCancelUnitForm={cancelForm}
                onToggleUnitArchived={toggleArchived}
              />
            ))
          )}

          {isAdding ? (
            <UnitForm initialValues={BLANK_UNIT} saving={saving} onSave={add} onCancel={cancelForm} />
          ) : (
            <button type="button" onClick={startAdding}>
              + Add unit
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
