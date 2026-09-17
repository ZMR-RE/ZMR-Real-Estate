import { useState, type FormEvent } from 'react'
import type { FinancialAccount, FinancialAccountInput, FinancialAccountType } from './financialAccountsQueries'

interface FinancialAccountFormProps {
  initialValues?: FinancialAccount
  saving: boolean
  onSave: (input: FinancialAccountInput) => void
  onCancel: () => void
}

const BLANK: FinancialAccountInput = { account_type: 'bank', nickname: '', last_four: '' }

export function FinancialAccountForm({ initialValues, saving, onSave, onCancel }: FinancialAccountFormProps) {
  const [values, setValues] = useState<FinancialAccountInput>(initialValues ?? BLANK)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="financial_account_type">Type</label>
      <select
        id="financial_account_type"
        value={values.account_type}
        onChange={(e) => setValues((prev) => ({ ...prev, account_type: e.target.value as FinancialAccountType }))}
      >
        <option value="bank">Bank account</option>
        <option value="credit_card">Credit card</option>
      </select>

      <label htmlFor="financial_account_nickname">Nickname</label>
      <input
        id="financial_account_nickname"
        required
        value={values.nickname}
        onChange={(e) => setValues((prev) => ({ ...prev, nickname: e.target.value }))}
        placeholder="e.g. Chase checking"
      />

      <label htmlFor="financial_account_last_four">Last 4 digits</label>
      <input
        id="financial_account_last_four"
        required
        inputMode="numeric"
        maxLength={4}
        value={values.last_four}
        onChange={(e) => setValues((prev) => ({ ...prev, last_four: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
        placeholder="1234"
      />
      <p>Never enter a full account or card number here — last 4 digits only.</p>

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
