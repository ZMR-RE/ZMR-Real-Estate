import { useState, type FormEvent } from 'react'
import { SearchableSelect, type SearchableSelectOption } from '../../shared/SearchableSelect'
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type EntryType,
  type RepairOrImprovement,
  type TransactionInput,
} from './financialsQueries'

interface TransactionFormProps {
  initialValues: TransactionInput
  propertyOptions: SearchableSelectOption[]
  saving: boolean
  onSave: (input: TransactionInput) => void
  onCancel: () => void
}

export function TransactionForm({
  initialValues,
  propertyOptions,
  saving,
  onSave,
  onCancel,
}: TransactionFormProps) {
  const [values, setValues] = useState<TransactionInput>(initialValues)

  const categoryOptions = values.entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleEntryTypeChange = (entryType: EntryType) => {
    const categories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setValues((prev) => ({
      ...prev,
      entryType,
      category: categories[0],
      repairOrImprovement: entryType === 'income' ? null : prev.repairOrImprovement,
    }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="property_id">Property</label>
      <SearchableSelect
        options={propertyOptions}
        value={values.propertyId || null}
        onChange={(id) => setValues((prev) => ({ ...prev, propertyId: id }))}
        placeholder="Select property"
      />

      <label htmlFor="unit">Unit</label>
      <input
        id="unit"
        placeholder='e.g. "Unit 1" or "ALL"'
        value={values.unit ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, unit: e.target.value || null }))}
      />

      <label htmlFor="entry_type">Type</label>
      <select
        id="entry_type"
        value={values.entryType}
        onChange={(e) => handleEntryTypeChange(e.target.value as EntryType)}
      >
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>

      <label htmlFor="category">Category</label>
      <select
        id="category"
        value={values.category}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, category: e.target.value as TransactionInput['category'] }))
        }
      >
        {categoryOptions.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </option>
        ))}
      </select>

      <label htmlFor="subcategory">Subcategory</label>
      <input
        id="subcategory"
        value={values.subcategory ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, subcategory: e.target.value || null }))}
      />

      <label htmlFor="vendor_source">Vendor / source</label>
      <input
        id="vendor_source"
        required
        value={values.vendorSource}
        onChange={(e) => setValues((prev) => ({ ...prev, vendorSource: e.target.value }))}
      />

      <label htmlFor="payment_method">Payment method</label>
      <input
        id="payment_method"
        required
        placeholder="e.g. Checking, Visa 1234"
        value={values.paymentMethod}
        onChange={(e) => setValues((prev) => ({ ...prev, paymentMethod: e.target.value }))}
      />

      {values.entryType === 'expense' && (
        <>
          <label htmlFor="repair_or_improvement">Repair or improvement</label>
          <select
            id="repair_or_improvement"
            value={values.repairOrImprovement ?? ''}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                repairOrImprovement: (e.target.value || null) as RepairOrImprovement | null,
              }))
            }
          >
            <option value="">—</option>
            <option value="repair">Repair</option>
            <option value="improvement">Improvement</option>
          </select>
        </>
      )}

      <label htmlFor="amount">Amount</label>
      <input
        id="amount"
        type="number"
        min="0.01"
        step="0.01"
        required
        value={values.amount || ''}
        onChange={(e) => setValues((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
      />

      <label htmlFor="transaction_date">Date</label>
      <input
        id="transaction_date"
        type="date"
        required
        value={values.transactionDate}
        onChange={(e) => setValues((prev) => ({ ...prev, transactionDate: e.target.value }))}
      />

      <label htmlFor="description">Description</label>
      <input
        id="description"
        value={values.description ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value || null }))}
      />

      <label htmlFor="statement_reconciled">
        <input
          id="statement_reconciled"
          type="checkbox"
          checked={values.statementReconciled}
          onChange={(e) => setValues((prev) => ({ ...prev, statementReconciled: e.target.checked }))}
        />
        Matched to bank/credit-card statement
      </label>

      <button
        type="submit"
        disabled={saving || !values.propertyId || !values.vendorSource || !values.paymentMethod}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
