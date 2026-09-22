import { useUnits } from './useUnits'
import { UnitForm } from './UnitForm'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { EditableSection } from '../../shared/EditableSection'
import { LeasingListingSection } from '../leasingListings/LeasingListingSection'
import { TenantAssignmentsSection } from '../tenants/TenantAssignmentsSection'
import { UtilityRecordsSection } from '../utilities/UtilityRecordsSection'
import type { Unit } from './unitsQueries'

interface UnitsSectionProps {
  propertyId: string
}

const BLANK_UNIT = { unit_label: '', status: '' }

// Roadmap 7.2 — units as a real entity, replacing the free-text
// properties.unit_config field. Embedded on the Overview tab for now,
// same as Security Deposits, until 7.9's tab restructure lands.
// Roadmap 7.4 revision — Specs & measurements no longer gets its own
// nested box per unit here; it's one consolidated section on the
// Overview tab (PropertySpecsSection) with a Scope field/filter that
// covers per-unit specs instead.
//
// Standard rollout completeness — converted to the Box interaction
// standard's EditableSection. "Show archived" is a view concern (which
// existing units to show), so it stays in secondaryActions and is visible
// in both view and edit states, same as before (7.23). View state shows
// each unit's label/status with no per-unit Edit/Archive controls or the
// standing "+ Add unit" button; Edit reveals both, plus each unit's own
// inline edit form. The nested Leasing/Tenants/Utility records
// subsections are unaffected by this box's own edit state — each already
// owns its own view/edit gate (Utility records via EditableSection,
// same as this box; Leasing and Tenants stay plain CollapsibleSection
// since neither has add/edit actions of its own yet).
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

  const renderUnitCard = (unit: Unit, interactive: boolean) =>
    interactive && editingId === unit.id ? (
      <div key={unit.id} className="unit-card">
        <UnitForm
          initialValues={{ unit_label: unit.unit_label, status: unit.status }}
          saving={saving}
          onSave={(input) => save(unit.id, input)}
          onCancel={cancelForm}
        />
      </div>
    ) : (
      <div key={unit.id} className={`unit-card${unit.archived ? ' row-voided' : ''}`}>
        <h3>{unit.unit_label}</h3>
        <p>Status: {unit.status}</p>
        <span className={`status-badge ${unit.archived ? 'status-badge-neutral' : 'status-badge-success'}`}>
          {unit.archived ? 'Archived' : 'Active'}
        </span>
        {interactive && (
          <>
            <button type="button" onClick={() => startEditing(unit.id)}>
              Edit
            </button>
            <button type="button" onClick={() => toggleArchived(unit)}>
              {unit.archived ? 'Restore' : 'Archive'}
            </button>
          </>
        )}

        <div className="unit-subsections-grid">
          <CollapsibleSection title="Leasing / listing history">
            <LeasingListingSection propertyId={propertyId} unitId={unit.id} />
          </CollapsibleSection>

          <CollapsibleSection title="Tenants">
            <TenantAssignmentsSection unitId={unit.id} />
          </CollapsibleSection>

          <UtilityRecordsSection propertyId={propertyId} unitId={unit.id} />
        </div>
      </div>
    )

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
            <p className="empty-state">No units logged yet.</p>
          ) : (
            units.map((unit) => renderUnitCard(unit, false))
          )}
        </>
      }
      edit={(exitEditing) => (
        <>
          {error && <p role="alert">{error}</p>}

          {loading ? (
            <p>Loading…</p>
          ) : units.length === 0 ? (
            <p className="empty-state">No units logged yet.</p>
          ) : (
            units.map((unit) => renderUnitCard(unit, true))
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
