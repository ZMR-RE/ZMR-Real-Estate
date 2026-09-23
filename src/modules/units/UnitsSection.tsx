import { useUnits, type UnitWithRent } from './useUnits'
import { UnitForm } from './UnitForm'
import { EditableSection } from '../../shared/EditableSection'
import { LeasingListingSection } from '../leasingListings/LeasingListingSection'
import { TenantAssignmentsSection } from '../tenants/TenantAssignmentsSection'
import { UtilityRecordsSection } from '../utilities/UtilityRecordsSection'

interface UnitsSectionProps {
  propertyId: string
}

const BLANK_UNIT = { unit_label: '', status: '' }

const rentFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

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
// owns its own view/edit gate via EditableSection (roadmap 7.28 brought
// Leasing/Tenants in line with Utility records here — no more caller-side
// CollapsibleSection wrapper, each renders its own box directly).
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

  // Roadmap 7.55 (5) — a single-unit property's own default Unit (7.55
  // (1)/(2): auto-created invisibly, never user-facing) must never show
  // "Unit 1" or any label — the address alone already identifies it, and
  // a lone unlabeled record would just read as internal plumbing leaking
  // into the UI. `units` here is already the currently-visible list
  // (archived filtered out unless the toggle is on), matching the same
  // basis the merged Units-occupied stat card uses for "how many units
  // does this property have." The moment a user adds a real second unit,
  // both labels reappear automatically — this is a live render
  // condition, not a stored flag.
  const isSingleUnit = units.length === 1

  const renderUnitCard = (unit: UnitWithRent, interactive: boolean) =>
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
        {!isSingleUnit && <h3>{unit.unit_label}</h3>}
        {/* Roadmap 7.55 (2) — the auto-created default unit (this
            property's own or the one-time 2169 Ash St backfill) starts
            with status '' rather than a guessed pick-list value (no
            default exists in the manual "+ Add unit" flow to copy, and
            inventing one would violate the data integrity rule) — shown
            plainly as "Not set" rather than an empty "Status: " line. */}
        <p>Status: {unit.status || 'Not set'}</p>
        <span className={`status-badge ${unit.archived ? 'status-badge-neutral' : 'status-badge-success'}`}>
          {unit.archived ? 'Archived' : 'Active'}
        </span>
        {/* Roadmap 7.55 (4) — "$0 — Not set up" rather than a blank/
            missing line when this unit has no current rent on file
            (either no current tenant assignment, or one exists with no
            rent_amount entered) — CLAUDE.md's Empty field visibility
            rule normally omits a field entirely when it has nothing to
            show, but rent is explicitly called out as the one exception
            here: a property manager scanning this box needs "not set up
            yet" to read as an actionable gap, not as "no rent, nothing
            to see." Real, current rent renders in the default text
            color, same weight as Status — only the not-set-up state
            gets the warning color. */}
        <p className={unit.currentRent === null ? 'unit-rent-value--warning' : undefined}>
          Rent: {unit.currentRent !== null ? `${rentFormatter.format(unit.currentRent)}/mo` : '$0 — Not set up'}
        </p>
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
          <LeasingListingSection propertyId={propertyId} unitId={unit.id} />
          <TenantAssignmentsSection unitId={unit.id} />
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
            <p className="empty-state">No units yet — add your first one to get the property set up.</p>
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
            <p className="empty-state">No units yet — add your first one to get the property set up.</p>
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
