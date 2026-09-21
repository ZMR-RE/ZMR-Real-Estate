import { useState, type FormEvent } from 'react'
import type { NewDepositInput } from './useSecurityDeposits'

interface DepositFormProps {
  saving: boolean
  todayDateString: () => string
  onSave: (input: NewDepositInput) => void
  onCancel: () => void
}

export function DepositForm({ saving, todayDateString, onSave, onCancel }: DepositFormProps) {
  const [unit, setUnit] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionDate, setTransactionDate] = useState(todayDateString())
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!(parsedAmount > 0)) return

    onSave({
      unit: unit.trim() || null,
      tenantName: tenantName.trim(),
      notes: notes.trim() || null,
      amount: parsedAmount,
      transactionDate,
      description: description.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Log a security deposit received</h3>
      <p>Posts to the "Security Deposits Held" liability account — never Income.</p>

      <label htmlFor="deposit_unit">Unit</label>
      <input id="deposit_unit" value={unit} onChange={(e) => setUnit(e.target.value)} />

      <label htmlFor="deposit_tenant">
        Tenant name<span className="required-marker">*</span>
      </label>
      <input
        id="deposit_tenant"
        value={tenantName}
        onChange={(e) => setTenantName(e.target.value)}
        required
      />

      <label htmlFor="deposit_amount">
        Amount received<span className="required-marker">*</span>
      </label>
      <input
        id="deposit_amount"
        type="number"
        step="0.01"
        min="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <label htmlFor="deposit_date">
        Date received<span className="required-marker">*</span>
      </label>
      <input
        id="deposit_date"
        type="date"
        value={transactionDate}
        onChange={(e) => setTransactionDate(e.target.value)}
        required
      />

      <label htmlFor="deposit_description">Description</label>
      <input id="deposit_description" value={description} onChange={(e) => setDescription(e.target.value)} />

      <label htmlFor="deposit_notes">Notes</label>
      <textarea id="deposit_notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <button type="submit" disabled={saving || !tenantName.trim()}>
        {saving ? 'Saving…' : 'Record deposit received'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
