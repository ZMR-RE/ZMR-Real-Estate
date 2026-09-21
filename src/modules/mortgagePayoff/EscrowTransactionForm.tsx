import { useState, type FormEvent } from 'react'
import type { EscrowTransactionType, MortgageEscrowTransactionInput } from './mortgagePayoffQueries'

interface EscrowTransactionFormProps {
  initialValues: MortgageEscrowTransactionInput
  saving: boolean
  error: string | null
  onSave: (input: MortgageEscrowTransactionInput) => Promise<boolean>
}

export function EscrowTransactionForm({ initialValues, saving, error, onSave }: EscrowTransactionFormProps) {
  const [values, setValues] = useState<MortgageEscrowTransactionInput>(initialValues)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const succeeded = await onSave(values)
    if (succeeded) {
      setValues(initialValues)
    }
  }

  return (
    <form className="escrow-transaction-form" onSubmit={handleSubmit}>
      <h3>Log an escrow transaction</h3>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="escrow_transaction_date">
        Date<span className="required-marker">*</span>
      </label>
      <input
        id="escrow_transaction_date"
        type="date"
        required
        value={values.transaction_date}
        onChange={(e) => setValues((prev) => ({ ...prev, transaction_date: e.target.value }))}
      />

      <label htmlFor="escrow_transaction_type">Type</label>
      <select
        id="escrow_transaction_type"
        value={values.transaction_type}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, transaction_type: e.target.value as EscrowTransactionType }))
        }
      >
        <option value="deposit">Deposit (into escrow)</option>
        <option value="disbursement">Disbursement (paid out of escrow)</option>
      </select>

      <label htmlFor="escrow_amount">
        Amount ($)<span className="required-marker">*</span>
      </label>
      <input
        id="escrow_amount"
        type="number"
        min="0.01"
        step="0.01"
        inputMode="decimal"
        required
        value={values.amount}
        onChange={(e) => setValues((prev) => ({ ...prev, amount: e.target.value }))}
      />

      <label htmlFor="escrow_description">Description</label>
      <input
        id="escrow_description"
        placeholder="e.g. Property tax installment, Homeowners insurance renewal"
        value={values.description ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value || null }))}
      />

      <button type="submit" disabled={saving}>
        {saving ? 'Logging…' : 'Log escrow transaction'}
      </button>
    </form>
  )
}
