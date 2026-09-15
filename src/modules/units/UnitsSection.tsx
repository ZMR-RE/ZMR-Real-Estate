import { useUnits } from './useUnits'
import { UnitForm } from './UnitForm'
import { PropertySpecsSection } from '../propertySpecs/PropertySpecsSection'
import { LeasingListingSection } from '../leasingListings/LeasingListingSection'
import { TenantAssignmentsSection } from '../tenants/TenantAssignmentsSection'
import { UtilityRecordsSection } from '../utilities/UtilityRecordsSection'

interface UnitsSectionProps {
  propertyId: string
}

const BLANK_UNIT = { unit_label: '', status: '' }

// Roadmap 7.2 — units as a real entity, replacing the free-text
// properties.unit_config field. Embedded on the Overview tab for now,
// same as Specs/Security Deposits, until 7.9's tab restructure lands.
// Each unit gets its own nested Specs & measurements section scoped to
// that unit's id (7.4's unit_id wired through) — separate from the
// property-level specs section elsewhere on this page.
export function UnitsSection({ propertyId }: UnitsSectionProps) {
  const { units, loading, error, isAdding, editingId, saving, startAdding, startEditing, cancelForm, add, save } =
    useUnits(propertyId)

  return (
    <section>
      <h2>Units</h2>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : units.length === 0 ? (
        <p>No units logged yet.</p>
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
            <div key={unit.id} className="unit-card">
              <h3>{unit.unit_label}</h3>
              <p>Status: {unit.status}</p>
              <button type="button" onClick={() => startEditing(unit.id)}>
                Edit
              </button>

              <PropertySpecsSection
                propertyId={propertyId}
                unitId={unit.id}
                title={`Specs & measurements — ${unit.unit_label}`}
                headingLevel="h4"
              />

              <LeasingListingSection
                propertyId={propertyId}
                unitId={unit.id}
                title={`Leasing / listing history — ${unit.unit_label}`}
                headingLevel="h4"
              />

              <TenantAssignmentsSection unitId={unit.id} title={`Tenants — ${unit.unit_label}`} />

              <h4>Utility records — {unit.unit_label}</h4>
              <UtilityRecordsSection propertyId={propertyId} unitId={unit.id} />
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
