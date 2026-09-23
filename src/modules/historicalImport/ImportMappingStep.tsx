import { FIELD_LABELS, REQUIRED_FIELDS, type ColumnMapping, type FinancialsField } from './csvParsing'

const FIELD_ORDER: FinancialsField[] = [
  'date',
  'amount',
  'entryType',
  'category',
  'subcategory',
  'vendor',
  'paymentMethod',
  'description',
  'repairOrImprovement',
]

interface ImportMappingStepProps {
  headers: string[]
  mapping: ColumnMapping
  onFieldMapping: (field: FinancialsField, columnIndex: number | null) => void
  defaultPaymentMethod: string
  onDefaultPaymentMethodChange: (value: string) => void
  onConfirm: () => void
  onBack: () => void
}

// Roadmap 2.4a — step 3, the "intelligent mapping" screen itself: every
// field arrives pre-filled with useHistoricalImport's best guess
// (csvParsing.guessMapping), but every dropdown is a real, editable
// <select> the user must review — this screen is what makes the
// approach "confirm before saving," not "silently guess and commit"
// (CLAUDE.md's Data integrity rule). Fields without a column in this
// file are left as "— Not in this file —" rather than forced to match
// something; entryType/category/vendor still get resolved on the next
// step even when unmapped, via a single "(same for every row)" value.
export function ImportMappingStep({
  headers,
  mapping,
  onFieldMapping,
  defaultPaymentMethod,
  onDefaultPaymentMethodChange,
  onConfirm,
  onBack,
}: ImportMappingStepProps) {
  const missingRequired = REQUIRED_FIELDS.filter((f) => mapping[f] === null)

  return (
    <div>
      <h3>Step 3: Match your columns</h3>
      <p>Confirm which column in your file corresponds to each field below. Fields left unmapped can still be set once for the whole file on the next step.</p>

      {FIELD_ORDER.map((field) => (
        <div key={field} className="field">
          <label htmlFor={`mapping_${field}`}>
            {FIELD_LABELS[field]}
            {REQUIRED_FIELDS.includes(field) && <span className="required-marker">*</span>}
          </label>
          <select
            id={`mapping_${field}`}
            value={mapping[field] ?? ''}
            onChange={(e) => onFieldMapping(field, e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">— Not in this file —</option>
            {headers.map((header, index) => (
              <option key={index} value={index}>
                {header}
              </option>
            ))}
          </select>
        </div>
      ))}

      {mapping.paymentMethod === null && (
        <div className="field">
          <label htmlFor="default_payment_method">
            Default payment method (used for every row — no "Payment method" column mapped)
            <span className="required-marker">*</span>
          </label>
          <input
            id="default_payment_method"
            value={defaultPaymentMethod}
            onChange={(e) => onDefaultPaymentMethodChange(e.target.value)}
            placeholder="e.g. Bank transfer"
          />
        </div>
      )}

      {missingRequired.length > 0 && (
        <p role="alert">Map at least: {missingRequired.map((f) => FIELD_LABELS[f]).join(', ')}.</p>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={missingRequired.length > 0 || (mapping.paymentMethod === null && !defaultPaymentMethod.trim())}
      >
        Next: Resolve values
      </button>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </div>
  )
}
