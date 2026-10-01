import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SearchableSelect, type SearchableSelectOption } from '../../shared/SearchableSelect'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import type { VendorInput } from '../vendors/vendorsQueries'
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type EntryType,
  type RepairOrImprovement,
  type TransactionInput,
} from './financialsQueries'
import { FIELD_NAMES, validateTransaction, type FieldErrors, type TransactionField } from './transactionEntry'
import { TransactionEntityField } from './TransactionEntityField'
import { TransactionPayerField } from './TransactionPayerField'
import type { EntryMessage } from './useTransactionEntry'

interface TransactionFormProps {
  mode: 'new' | 'edit'
  heading: string
  initialValues: TransactionInput
  // True for the second and later drafts of a "Save and add another"
  // chain: focus goes to the first field that isn't carried over.
  continuing: boolean
  propertyOptions: SearchableSelectOption[]
  vendorOptions: SearchableSelectOption[]
  onCreateVendor: (input: VendorInput) => Promise<{ id: string } | { error: string }>
  saving: boolean
  // Failed/uncertain save outcome, shown inside the form next to the draft
  // it refers to (the draft itself is never cleared on failure).
  message: EntryMessage | null
  storedTenantName?: string
  onSave: (input: TransactionInput, addAnother: boolean) => Promise<boolean>
  onCancel: () => void
}

const FIELD_ORDER: TransactionField[] = ['propertyId', 'category', 'payer', 'paymentMethod', 'amount', 'transactionDate']
const FIELD_INPUT_IDS: Record<TransactionField, string> = {
  propertyId: 'property_id',
  category: 'category',
  payer: 'payer_input',
  paymentMethod: 'payment_method',
  amount: 'amount',
  transactionDate: 'transaction_date',
}

function focusField(field: TransactionField) {
  const el = document.getElementById(FIELD_INPUT_IDS[field])
  const target = el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el : el?.querySelector('input, select, button')
  if (target instanceof HTMLElement) target.focus()
}

export function TransactionForm({
  mode,
  heading,
  initialValues,
  continuing,
  propertyOptions,
  vendorOptions,
  onCreateVendor,
  saving,
  message,
  storedTenantName,
  onSave,
  onCancel,
}: TransactionFormProps) {
  const [values, setValues] = useState<TransactionInput>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [attempted, setAttempted] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const typeRef = useRef<HTMLSelectElement>(null)
  const submitterRef = useRef<'save' | 'another'>('save')

  // M3 — bring the form into view and move focus into it, so Edit
  // (clicked far down the list) visibly does something.
  useEffect(() => {
    headingRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    if (continuing) typeRef.current?.focus({ preventScroll: true })
    else headingRef.current?.focus({ preventScroll: true })
  }, [continuing])

  const update = (patch: Partial<TransactionInput>) => {
    const next = { ...values, ...patch }
    setValues(next)
    // Once a save was attempted, errors update live as fields are fixed.
    if (attempted) setErrors(validateTransaction(next, mode === 'new'))
  }

  const categoryOptions = values.entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleEntryTypeChange = (entryType: EntryType) => {
    const categories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    update({
      entryType,
      category: categories[0],
      repairOrImprovement: entryType === 'income' ? null : values.repairOrImprovement,
      // A tenant can only be the payer of income.
      payer: entryType === 'expense' && values.payer.kind === 'tenant' ? { kind: 'none' } : values.payer,
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    const found = validateTransaction(values, mode === 'new')
    setErrors(found)
    setAttempted(true)
    const firstInvalid = FIELD_ORDER.find((f) => found[f])
    if (firstInvalid) {
      focusField(firstInvalid)
      return
    }
    await onSave(values, submitterRef.current === 'another')
  }

  const invalidFields = FIELD_ORDER.filter((f) => errors[f])
  const errorId = (field: TransactionField) => `${FIELD_INPUT_IDS[field]}_error`
  const fieldError = (field: TransactionField) =>
    errors[field] ? (
      <p className="field-error" id={errorId(field)}>
        {errors[field]}
      </p>
    ) : null

  return (
    <form onSubmit={handleSubmit} className="transaction-form" noValidate aria-labelledby="transaction_form_heading">
      <h2 id="transaction_form_heading" ref={headingRef} tabIndex={-1}>
        {heading}
      </h2>

      {invalidFields.length > 0 && (
        <p role="alert">Not saved yet. Fix: {invalidFields.map((f) => FIELD_NAMES[f]).join(', ')}.</p>
      )}
      {message && message.kind !== 'saved' && <p role="alert">{message.text}</p>}

      <label id="property_label">
        Property<span className="required-marker">*</span>
      </label>
      <div
        id="property_id"
        aria-labelledby="property_label"
        aria-describedby={errors.propertyId ? errorId('propertyId') : undefined}
      >
        <SearchableSelect
          options={propertyOptions}
          value={values.propertyId || null}
          onChange={(id) => update({ propertyId: id })}
          placeholder="Select property"
        />
      </div>
      {fieldError('propertyId')}

      <label htmlFor="unit">Unit</label>
      <input
        id="unit"
        placeholder='e.g. "Unit 1" or "ALL"'
        value={values.unit ?? ''}
        onChange={(e) => update({ unit: e.target.value || null })}
      />

      <label htmlFor="entry_type">Type</label>
      <select
        id="entry_type"
        ref={typeRef}
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
        aria-invalid={errors.category ? true : undefined}
        aria-describedby={errors.category ? errorId('category') : undefined}
        onChange={(e) => update({ category: e.target.value as TransactionInput['category'] })}
      >
        {categoryOptions.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </option>
        ))}
      </select>
      {fieldError('category')}

      <label htmlFor="subcategory">Subcategory</label>
      <PickListSelect
        id="subcategory"
        listName="subcategory"
        title="Subcategories"
        value={values.subcategory ?? ''}
        onChange={(value) => update({ subcategory: value || null })}
      />

      <TransactionPayerField
        entryType={values.entryType}
        propertyId={values.propertyId}
        payer={values.payer}
        onChange={(payer) => update({ payer })}
        vendorOptions={vendorOptions}
        onCreateVendor={onCreateVendor}
        error={errors.payer}
        errorId={errorId('payer')}
        storedTenantName={storedTenantName}
      />

      <label htmlFor="payment_method">
        Payment method<span className="required-marker">*</span>
      </label>
      <PickListSelect
        id="payment_method"
        listName="payment_method"
        title="Payment methods"
        value={values.paymentMethod}
        onChange={(value) => update({ paymentMethod: value })}
        required
        invalid={!!errors.paymentMethod}
        describedBy={errors.paymentMethod ? errorId('paymentMethod') : undefined}
        emptySetup={{
          explanation:
            'No payment methods are set up yet. Add the ways money moves for your properties (for example “Checking account” or “Credit card”). You only need to do this once.',
          addLabel: 'Add payment method',
        }}
      />
      {fieldError('paymentMethod')}

      {values.entryType === 'expense' && (
        <>
          <label htmlFor="repair_or_improvement">Repair or improvement</label>
          <select
            id="repair_or_improvement"
            value={values.repairOrImprovement ?? ''}
            onChange={(e) => update({ repairOrImprovement: (e.target.value || null) as RepairOrImprovement | null })}
          >
            <option value="">—</option>
            <option value="repair">Repair</option>
            <option value="improvement">Improvement</option>
          </select>
          {values.repairOrImprovement === 'improvement' && (
            <p className="field-hint">
              Improvements are kept out of operating expenses and profit, and shown separately as capital spending.
            </p>
          )}
        </>
      )}

      <label htmlFor="amount">
        Amount<span className="required-marker">*</span>
      </label>
      <input
        id="amount"
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        aria-invalid={errors.amount ? true : undefined}
        aria-describedby={errors.amount ? errorId('amount') : undefined}
        value={values.amount || ''}
        onChange={(e) => update({ amount: parseFloat(e.target.value) || 0 })}
      />
      {fieldError('amount')}

      <label htmlFor="transaction_date">
        Date<span className="required-marker">*</span>
      </label>
      <input
        id="transaction_date"
        type="date"
        aria-invalid={errors.transactionDate ? true : undefined}
        aria-describedby={errors.transactionDate ? errorId('transactionDate') : undefined}
        value={values.transactionDate}
        onChange={(e) => update({ transactionDate: e.target.value })}
      />
      {fieldError('transactionDate')}

      <TransactionEntityField
        propertyId={values.propertyId}
        transactionDate={values.transactionDate}
        value={values.responsibleEntityId}
        onChange={(responsibleEntityId) => update({ responsibleEntityId })}
      />

      <label htmlFor="description">Description</label>
      <input
        id="description"
        value={values.description ?? ''}
        onChange={(e) => update({ description: e.target.value || null })}
      />

      <label htmlFor="statement_reconciled">
        <input
          id="statement_reconciled"
          type="checkbox"
          checked={values.statementReconciled}
          onChange={(e) => update({ statementReconciled: e.target.checked })}
        />
        Matched to bank/credit-card statement
      </label>

      <div className="transaction-form-actions">
        <button type="submit" disabled={saving} onClick={() => (submitterRef.current = 'save')}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {mode === 'new' && (
          <button type="submit" className="transaction-form-secondary-submit" disabled={saving} onClick={() => (submitterRef.current = 'another')}>
            Save and add another
          </button>
        )}
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}
