import { useState, type FormEvent } from 'react'
import type { MortgagePaymentInput } from './mortgagePayoffQueries'

interface MortgagePaymentFormProps {
  initialValues: MortgagePaymentInput
  saving: boolean
  error: string | null
  onSave: (input: MortgagePaymentInput) => Promise<boolean>
}

export function MortgagePaymentForm({ initialValues, saving, error, onSave }: MortgagePaymentFormProps) {
  const [values, setValues] = useState<MortgagePaymentInput>(initialValues)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const succeeded = await onSave(values)
    if (succeeded) {
      setValues(initialValues)
    }
  }

  return (
    <form className="mortgage-payment-form" onSubmit={handleSubmit}>
      <h3>Log a payment</h3>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="payment_date">Date</label>
      <input
        id="payment_date"
        type="date"
        required
        value={values.payment_date}
        onChange={(e) => setValues((prev) => ({ ...prev, payment_date: e.target.value }))}
      />

      <label htmlFor="payment_amount">Total amount ($)</label>
      <input
        id="payment_amount"
        type="number"
        min="0.01"
        step="0.01"
        inputMode="decimal"
        required
        value={values.amount}
        onChange={(e) => setValues((prev) => ({ ...prev, amount: e.target.value }))}
      />

      <label htmlFor="principal_amount">Principal ($)</label>
      <input
        id="principal_amount"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        required
        value={values.principal_amount}
        onChange={(e) => setValues((prev) => ({ ...prev, principal_amount: e.target.value }))}
      />

      <label htmlFor="interest_amount">Interest ($)</label>
      <input
        id="interest_amount"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        required
        value={values.interest_amount}
        onChange={(e) => setValues((prev) => ({ ...prev, interest_amount: e.target.value }))}
      />

      <button type="submit" disabled={saving}>
        {saving ? 'Logging…' : 'Log payment'}
      </button>
    </form>
  )
}
