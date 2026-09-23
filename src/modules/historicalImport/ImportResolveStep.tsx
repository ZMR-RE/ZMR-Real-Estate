import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Category,
  type EntryType,
} from '../financials/financialsQueries'
import { UNMAPPED_SENTINEL } from './csvParsing'
import type { VendorResolution } from './useHistoricalImport'

function displayValue(raw: string): string {
  return raw === UNMAPPED_SENTINEL ? '(same for every row)' : raw === '' ? '(blank)' : raw
}

interface ImportResolveStepProps {
  entryTypeValues: string[]
  entryTypeResolution: Record<string, EntryType>
  onEntryTypeChange: (raw: string, value: EntryType) => void

  categoryKeys: string[]
  categoryResolution: Record<string, Category>
  onCategoryChange: (key: string, value: Category) => void

  vendorValues: string[]
  vendorResolution: Record<string, VendorResolution>
  onVendorChange: (raw: string, value: VendorResolution) => void
  vendorOptions: { id: string; label: string }[]

  onConfirm: () => void
  onBack: () => void
}

const VENDOR_NONE = '__none__'
const VENDOR_CREATE = '__create__'

// Roadmap 2.4a — step 4: resolves each *distinct* raw value found in
// the mapped Income/Expense, Category, and Vendor columns (not every
// row individually — a 200-row file with 6 distinct vendors only asks
// 6 questions). Every dropdown here is pre-filled with a best guess
// (useHistoricalImport.confirmMapping) but is a real editable control —
// the whole point of this screen, same as the mapping step, is that
// nothing gets silently guessed and committed.
export function ImportResolveStep({
  entryTypeValues,
  entryTypeResolution,
  onEntryTypeChange,
  categoryKeys,
  categoryResolution,
  onCategoryChange,
  vendorValues,
  vendorResolution,
  onVendorChange,
  vendorOptions,
  onConfirm,
  onBack,
}: ImportResolveStepProps) {
  return (
    <div>
      <h3>Step 4: Resolve values</h3>
      <p>Your file uses its own wording for these — confirm what each one means before anything is imported.</p>

      <h4>Income or Expense</h4>
      {entryTypeValues.map((raw) => (
        <div key={raw} className="field">
          <label htmlFor={`entry_type_${raw}`}>"{displayValue(raw)}" means</label>
          <select
            id={`entry_type_${raw}`}
            value={entryTypeResolution[raw] ?? 'expense'}
            onChange={(e) => onEntryTypeChange(raw, e.target.value as EntryType)}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
      ))}

      <h4>Category</h4>
      {categoryKeys.map((key) => {
        const [entryType, rawCategory] = key.split('::') as [EntryType, string]
        const list = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
        return (
          <div key={key} className="field">
            <label htmlFor={`category_${key}`}>
              {entryType === 'income' ? 'Income' : 'Expense'} rows where category is "{displayValue(rawCategory)}"
            </label>
            <select
              id={`category_${key}`}
              value={categoryResolution[key] ?? ''}
              onChange={(e) => onCategoryChange(key, e.target.value as Category)}
            >
              {list.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        )
      })}

      <h4>Vendor</h4>
      {vendorValues.map((raw) => {
        const res = vendorResolution[raw]
        const selectValue = res?.mode === 'existing' ? res.vendorId : res?.mode === 'create' ? VENDOR_CREATE : VENDOR_NONE
        return (
          <div key={raw} className="field">
            <label htmlFor={`vendor_${raw}`}>"{displayValue(raw)}"</label>
            <select
              id={`vendor_${raw}`}
              value={selectValue}
              onChange={(e) => {
                const value = e.target.value
                if (value === VENDOR_NONE) onVendorChange(raw, { mode: 'none' })
                else if (value === VENDOR_CREATE) onVendorChange(raw, { mode: 'create' })
                else onVendorChange(raw, { mode: 'existing', vendorId: value })
              }}
            >
              <option value={VENDOR_NONE}>No vendor</option>
              {raw !== UNMAPPED_SENTINEL && raw !== '' && (
                <option value={VENDOR_CREATE}>+ Create new vendor "{raw}"</option>
              )}
              {vendorOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  Use existing: {v.label}
                </option>
              ))}
            </select>
          </div>
        )
      })}

      <button type="button" onClick={onConfirm}>
        Next: Preview
      </button>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </div>
  )
}
