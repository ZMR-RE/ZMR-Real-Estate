import { usePickListOptions } from '../../shared/pickLists/usePickListOptions'
import { usePropertySpecs } from './usePropertySpecs'
import { PropertySpecForm } from './PropertySpecForm'
import { PropertySpecList } from './PropertySpecList'

interface PropertySpecsSectionProps {
  propertyId: string
}

const BLANK_SPEC = { unitId: null, area: '', label: '', value: '' }

// Roadmap 7.4 revision — consolidated into one property-level section,
// replacing the previous split of a property-wide instance here plus a
// separate instance nested inside each unit's card in UnitsSection.tsx.
// Scope (Whole building vs a specific unit) and Area are now per-row
// fields instead of being implied by which instance of the component you
// were looking at, with filter controls (mirroring Quick Capture
// History's filter bar, roadmap 1.24) to narrow the one combined list.
export function PropertySpecsSection({ propertyId }: PropertySpecsSectionProps) {
  const {
    specs,
    units,
    loading,
    error,
    isAdding,
    editingId,
    saving,
    scopeFilter,
    setScopeFilter,
    areaFilter,
    setAreaFilter,
    startAdding,
    startEditing,
    cancelForm,
    add,
    save,
    refreshUnitOptions,
  } = usePropertySpecs(propertyId)
  const { activeOptions: areaOptions } = usePickListOptions('property_spec_area')

  return (
    <section>
      {error && <p role="alert">{error}</p>}

      <div className="property-specs-filter-bar">
        <div className="property-specs-filter">
          <label htmlFor="specs_scope_filter">Scope</label>
          <select
            id="specs_scope_filter"
            value={scopeFilter}
            onFocus={refreshUnitOptions}
            onChange={(e) => setScopeFilter(e.target.value)}
          >
            <option value="all">All scopes</option>
            <option value="whole_building">Whole building</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unit_label}
                {unit.archived ? ' (archived)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="property-specs-filter">
          <label htmlFor="specs_area_filter">Area</label>
          <select id="specs_area_filter" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="all">All areas</option>
            {areaOptions.map((option) => (
              <option key={option.id} value={option.value}>
                {option.value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <PropertySpecList
          specs={specs}
          unitOptions={units}
          onRefreshUnitOptions={refreshUnitOptions}
          editingId={editingId}
          saving={saving}
          onStartEditing={startEditing}
          onSave={save}
          onCancel={cancelForm}
        />
      )}

      {isAdding ? (
        <PropertySpecForm
          initialValues={BLANK_SPEC}
          unitOptions={units}
          onRefreshUnitOptions={refreshUnitOptions}
          saving={saving}
          onSave={add}
          onCancel={cancelForm}
        />
      ) : (
        <button type="button" onClick={startAdding}>
          + Add spec
        </button>
      )}
    </section>
  )
}
