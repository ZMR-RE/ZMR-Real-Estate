import { useState, type FormEvent } from 'react'
import type { MortgageDetailsInput } from './mortgagePayoffQueries'

interface MortgageDetailsFormProps {
  initialValues: MortgageDetailsInput
  saving: boolean
  canCancel: boolean
  onSave: (input: MortgageDetailsInput) => void
  onCancel: () => void
}

export function MortgageDetailsForm({
  initialValues,
  saving,
  canCancel,
  onSave,
  onCancel,
}: MortgageDetailsFormProps) {
  const [values, setValues] = useState<MortgageDetailsInput>(initialValues)

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

      <label htmlFor="original_loan_amount">Original loan amount ($)</label>
      <input
        id="original_loan_amount"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={values.original_loan_amount}
        onChange={(e) => setValues((prev) => ({ ...prev, original_loan_amount: e.target.value }))}
        required
      />

      <label htmlFor="current_balance">Current balance ($)</label>
      <input
        id="current_balance"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={values.current_balance}
        onChange={(e) => setValues((prev) => ({ ...prev, current_balance: e.target.value }))}
        required
      />

      <label htmlFor="interest_rate">Interest rate (annual %)</label>
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

      <label htmlFor="monthly_payment">Monthly payment — P&I ($)</label>
      <input
        id="monthly_payment"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={values.monthly_payment}
        onChange={(e) => setValues((prev) => ({ ...prev, monthly_payment: e.target.value }))}
        required
      />

      <label htmlFor="loan_start_date">Loan start date</label>
      <input
        id="loan_start_date"
        type="date"
        value={values.loan_start_date}
        onChange={(e) => setValues((prev) => ({ ...prev, loan_start_date: e.target.value }))}
        required
      />

      <label htmlFor="term_years">Term (years)</label>
      <input
        id="term_years"
        type="number"
        min="1"
        step="1"
        value={values.term_years}
        onChange={(e) => setValues((prev) => ({ ...prev, term_years: Number(e.target.value) }))}
        required
      />

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save mortgage details'}
      </button>
      {canCancel && (
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      )}
    </form>
  )
}
