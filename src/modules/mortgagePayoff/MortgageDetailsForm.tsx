import { Fragment, useState, type FormEvent } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import { formatCurrencyInputOnBlur } from './mortgagePayoffFormat'
import type { MortgageDetailsInput } from './mortgagePayoffQueries'

interface MortgageDetailsFormProps {
  initialValues: MortgageDetailsInput
  saving: boolean
  // A refused save, shown inside the form; the form keeps the user's entries.
  error: string | null
  canCancel: boolean
  onSave: (input: MortgageDetailsInput) => void
  onCancel: () => void
}

export function MortgageDetailsForm({
  initialValues,
  saving,
  error,
  canCancel,
  onSave,
  onCancel,
}: MortgageDetailsFormProps) {
  // Lazy initializer: formats the four dollar fields to two decimals the
  // instant an existing record loads into the form, not just after a blur
  // — original_loan_amount/current_balance/monthly_payment are always
  // present on an existing record so formatCurrencyInputOnBlur runs
  // unconditionally; escrow_balance stays null when genuinely blank
  // (never coerced to "0.00"). A brand-new mortgage's blank strings pass
  // through formatCurrencyInputOnBlur unchanged.
  const [values, setValues] = useState<MortgageDetailsInput>(() => ({
    ...initialValues,
    original_loan_amount: formatCurrencyInputOnBlur(initialValues.original_loan_amount),
    current_balance: formatCurrencyInputOnBlur(initialValues.current_balance),
    monthly_payment: formatCurrencyInputOnBlur(initialValues.monthly_payment),
    escrow_balance:
      initialValues.escrow_balance === null ? null : formatCurrencyInputOnBlur(initialValues.escrow_balance),
  }))

  const field = (key: keyof MortgageDetailsInput) => ({
    value: values[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value || null })),
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form className="mortgage-details-form" onSubmit={handleSubmit}>
      <h2>Mortgage details</h2>

      <label htmlFor="lender_name">Lender</label>
      <input id="lender_name" {...field('lender_name')} />

      {/* Owner-approved exception to the app's otherwise-standard
          "last four digits only" convention — the full loan number,
          free text (leading zeros and letters both occur in real loan
          numbers and would be lost by a numeric field). Optional: never
          backfilled for an existing mortgage. */}
      <label htmlFor="loan_number">Loan number</label>
      <input id="loan_number" {...field('loan_number')} />

      {/* Pick-list-governed (8.1), not a fixed enum — owner can add/
          archive beyond the 8 approved starting values via "+ Manage
          loan type" below. Optional: never backfilled for an existing
          mortgage. */}
      <label htmlFor="loan_type">Loan type</label>
      <PickListSelect
        id="loan_type"
        listName="loan_type"
        title="Loan type"
        value={values.loan_type ?? ''}
        onChange={(value) => setValues((prev) => ({ ...prev, loan_type: value || null }))}
      />

      <label htmlFor="original_loan_amount">
        Original loan amount ($)<span className="required-marker">*</span>
      </label>
      <input
        id="original_loan_amount"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={values.original_loan_amount}
        onChange={(e) => setValues((prev) => ({ ...prev, original_loan_amount: e.target.value }))}
        onBlur={(e) =>
          setValues((prev) => ({ ...prev, original_loan_amount: formatCurrencyInputOnBlur(e.target.value) }))
        }
        required
      />

      <label htmlFor="current_balance">
        Current balance ($)<span className="required-marker">*</span>
      </label>
      <input
        id="current_balance"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={values.current_balance}
        onChange={(e) => setValues((prev) => ({ ...prev, current_balance: e.target.value }))}
        onBlur={(e) => setValues((prev) => ({ ...prev, current_balance: formatCurrencyInputOnBlur(e.target.value) }))}
        required
      />

      <label htmlFor="interest_rate">
        Interest rate (annual %)<span className="required-marker">*</span>
      </label>
      <input
        id="interest_rate"
        type="number"
        min="0"
        step="0.001"
        inputMode="decimal"
        value={values.interest_rate}
        onChange={(e) => setValues((prev) => ({ ...prev, interest_rate: e.target.value }))}
        required
      />

      <label htmlFor="monthly_payment">
        Monthly payment — P&I ($)<span className="required-marker">*</span>
      </label>
      <input
        id="monthly_payment"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={values.monthly_payment}
        onChange={(e) => setValues((prev) => ({ ...prev, monthly_payment: e.target.value }))}
        onBlur={(e) => setValues((prev) => ({ ...prev, monthly_payment: formatCurrencyInputOnBlur(e.target.value) }))}
        required
      />

      <label htmlFor="loan_start_date">
        Loan start date<span className="required-marker">*</span>
      </label>
      <input
        id="loan_start_date"
        type="date"
        value={values.loan_start_date}
        onChange={(e) => setValues((prev) => ({ ...prev, loan_start_date: e.target.value }))}
        required
      />

      <label htmlFor="escrow_balance">Escrow balance ($)</label>
      <input
        id="escrow_balance"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        placeholder="Leave blank if no escrow account"
        value={values.escrow_balance ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, escrow_balance: e.target.value || null }))}
        onBlur={(e) =>
          setValues((prev) => ({
            ...prev,
            escrow_balance: e.target.value === '' ? null : formatCurrencyInputOnBlur(e.target.value),
          }))
        }
      />

      <label htmlFor="balance_statement_date">Statement date for these balances</label>
      <input
        id="balance_statement_date"
        type="date"
        value={values.balance_statement_date ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, balance_statement_date: e.target.value || null }))}
      />
      <p className="field-hint">
        Optional, and used only when you change a balance here: the statement date the new figure comes from. Entries dated
        on or before it are flagged for review. To confirm an unchanged balance, use “matches my statement” in the Action
        Queue.
      </p>

      <label htmlFor="term_years">
        Term (years)<span className="required-marker">*</span>
      </label>
      <input
        id="term_years"
        type="number"
        min="1"
        step="1"
        value={values.term_years}
        onChange={(e) => setValues((prev) => ({ ...prev, term_years: Number(e.target.value) }))}
        required
      />

      {/* Beside Save, where the user is looking when a save is refused (the form is long). */}
      {error && (
        <p role="alert">
          {/* Multi-line messages (stale-balance conflict) show one fact or choice per line. */}
          {error.split('\n').map((line, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </p>
      )}
      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      {canCancel && (
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      )}
    </form>
  )
}
