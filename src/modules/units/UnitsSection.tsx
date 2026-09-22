import { useUnits } from './useUnits'
import { UnitForm } from './UnitForm'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { LeasingListingSection } from '../leasingListings/LeasingListingSection'
import { TenantAssignmentsSection } from '../tenants/TenantAssignmentsSection'
import { UtilityRecordsSection } from '../utilities/UtilityRecordsSection'

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
export function UnitsSection({ propertyId }: UnitsSectionProps) {
  const {
    units,
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

  return (
    <section>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : units.length === 0 ? (
        <p className="empty-state">No units logged yet.</p>
      ) : (
        units.map((unit) =>
          editingId === unit.id ? (
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
              <button type="button" onClick={() => startEditing(unit.id)}>
                Edit
              </button>
              <button type="button" onClick={() => toggleArchived(unit)}>
                {unit.archived ? 'Restore' : 'Archive'}
              </button>

              <div className="unit-subsections-grid">
                <CollapsibleSection title="Leasing / listing history">
                  <LeasingListingSection propertyId={propertyId} unitId={unit.id} />
                </CollapsibleSection>

                <CollapsibleSection title="Tenants">
                  <TenantAssignmentsSection unitId={unit.id} />
                </CollapsibleSection>

                <CollapsibleSection title="Utility records">
                  <UtilityRecordsSection propertyId={propertyId} unitId={unit.id} />
                </CollapsibleSection>
              </div>
            </div>
          ),
        )
      )}

      {isAdding ? (
        <UnitForm initialValues={BLANK_UNIT} saving={saving} onSave={add} onCancel={cancelForm} />
      ) : (
        <button type="button" onClick={startAdding}>
          + Add unit
        </button>
      )}
    </section>
  )
}
