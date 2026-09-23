import { SearchableSelect, type SearchableSelectOption } from '../../shared/SearchableSelect'

interface ImportPropertyStepProps {
  fileName: string
  rowCount: number
  propertyOptions: SearchableSelectOption[]
  propertyId: string | null
  onPropertyChange: (id: string | null) => void
  onConfirm: () => void
}

// Roadmap 2.4a — step 2: which property this whole file belongs to. A
// historical spreadsheet is virtually always kept per-property, so this
// is a single choice for the entire import rather than a per-row
// mapping — a deliberate scope simplification, noted in the roadmap
// entry rather than silently assumed.
export function ImportPropertyStep({
  fileName,
  rowCount,
  propertyOptions,
  propertyId,
  onPropertyChange,
  onConfirm,
}: ImportPropertyStepProps) {
  return (
    <div>
      <h3>Step 2: Which property is this?</h3>
      <p>
        {fileName} — {rowCount} row{rowCount === 1 ? '' : 's'} found. Every transaction in this file will be
        imported against one property.
      </p>

      <label htmlFor="historical_import_property">
        Property<span className="required-marker">*</span>
      </label>
      <SearchableSelect
        options={propertyOptions}
        value={propertyId}
        onChange={onPropertyChange}
        placeholder="Select a property"
      />

      <button type="button" onClick={onConfirm} disabled={!propertyId}>
        Next: Map columns
      </button>
    </div>
  )
}
