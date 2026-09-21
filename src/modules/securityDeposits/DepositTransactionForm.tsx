import { useState, type FormEvent } from 'react'
import type { DepositBalance, ReturnOrDamagesInput } from './useSecurityDeposits'

interface DepositTransactionFormProps {
  securityDepositId: string
  balance: DepositBalance
  saving: boolean
  todayDateString: () => string
  onSave: (input: ReturnOrDamagesInput) => void
  onCancel: () => void
}

export function DepositTransactionForm({
  securityDepositId,
  balance,
  saving,
  todayDateString,
  onSave,
  onCancel,
}: DepositTransactionFormProps) {
  const [transactionType, setTransactionType] = useState<'returned' | 'applied_to_damages'>('returned')
  const [amount, setAmount] = useState('')
  const [transactionDate, setTransactionDate] = useState(todayDateString())
  const [description, setDescription] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!(parsedAmount > 0)) return

    onSave({
      securityDepositId,
      transactionType,
      amount: parsedAmount,
      transactionDate,
      description: description.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Return deposit or apply to damages</h3>
      <p>Remaining balance held: ${balance.remaining.toFixed(2)}</p>

      <label htmlFor="deposit_tx_type">Transaction type</label>
      <select
        id="deposit_tx_type"
        value={transactionType}
        onChange={(e) => setTransactionType(e.target.value as 'returned' | 'applied_to_damages')}
      >
        <option value="returned">Deposit returned to tenant</option>
        <option value="applied_to_damages">Applied to damages</option>
      </select>

      <label htmlFor="deposit_tx_amount">
        Amount<span className="required-marker">*</span>
      </label>
      <input
        id="deposit_tx_amount"
        type="number"
        step="0.01"
        min="0.01"
        max={balance.remaining}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <label htmlFor="deposit_tx_date">
        Date<span className="required-marker">*</span>
      </label>
      <input
        id="deposit_tx_date"
        type="date"
        value={transactionDate}
        onChange={(e) => setTransactionDate(e.target.value)}
        required
      />

      <label htmlFor="deposit_tx_description">Description</label>
      <input
        id="deposit_tx_description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button type="submit" disabled={saving || balance.remaining <= 0}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
