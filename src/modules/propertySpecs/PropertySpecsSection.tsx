import { usePickListOptions } from '../../shared/pickLists/usePickListOptions'
import { usePropertySpecs } from './usePropertySpecs'
import { PropertySpecForm } from './PropertySpecForm'
import { PropertySpecList } from './PropertySpecList'
import { EditableSection } from '../../shared/EditableSection'

interface PropertySpecsSectionProps {
  propertyId: string
}

const BLANK_SPEC = { unitId: null, area: '', label: '', value: '' }

// Standard rollout completeness — converted to the Box interaction
// standard's EditableSection. The Scope/Area filter bar is a view
// concern (it only narrows which rows are visible), not an editing
// concern, so it's passed as secondaryActions and stays visible in both
// view and edit states, same as "Show archived" elsewhere.
export function PropertySpecsSection({ propertyId }: PropertySpecsSectionProps) {
  const {
    specs, units, loading, error, isAdding, editingId, saving,
    scopeFilter, setScopeFilter, areaFilter, setAreaFilter,
    startAdding, startEditing, cancelForm, add, save, refreshUnitOptions,
  } = usePropertySpecs(propertyId)
  const { activeOptions: areaOptions } = usePickListOptions('property_spec_area')

  // Roadmap "Units/Lease/Tenant rebuild" item 5 — a single-unit
  // property's own unit must never surface as a selectable "Unit 1"
  // choice (same principle as UnitsSection.tsx hiding its label): with
  // only one unit, "Whole building" and "that one unit" are the same
  // physical space, so offering both as distinct Scope choices is just
  // confusing, redundant UI. Only affects PICKERS (this filter, and
  // PropertySpecForm's own scope select below) — PropertySpecList still
  // gets the full, unfiltered `units` so it can correctly resolve/
  // display any EXISTING spec that already has a real unit_id set
  // (e.g. from before this property had only one unit).
  const isSingleUnit = units.filter((u) => !u.archived).length === 1
  const pickerUnitOptions = isSingleUnit ? [] : units

  const filterBar = (
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
          {pickerUnitOptions.map((unit) => (
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
  )

  return (
    <EditableSection
      title="Specs & measurements"
      secondaryActions={filterBar}
      onEditStart={cancelForm}
      view={
        <>
          {error && <p role="alert">{error}</p>}
          {loading ? (
            <p>Loading…</p>
          ) : (
            <PropertySpecList
              specs={specs}
              unitOptions={units}
              onRefreshUnitOptions={refreshUnitOptions}
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
              unitOptions={pickerUnitOptions}
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
          <button type="button" onClick={exitEditing}>
            Done
          </button>
        </>
      )}
    />
  )
}
