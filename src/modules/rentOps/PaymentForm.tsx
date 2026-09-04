import { useState, type FormEvent } from 'react'
import type { PaymentInput } from './rentOpsQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

interface PaymentFormProps {
  invoiceId: string
  saving: boolean
  onSave: (input: PaymentInput) => void
  onCancel: () => void
}

export function PaymentForm({ invoiceId, saving, onSave, onCancel }: PaymentFormProps) {
  const [amount, setAmount] = useState('')
  const [paidDate, setPaidDate] = useState(todayDateString())
  const [method, setMethod] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({
      invoiceId,
      amount,
      paidDate,
      method: method.trim() || null,
      notes: notes.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Record payment</h3>

      <label htmlFor="payment_amount">Amount</label>
      <input
        id="payment_amount"
        type="number"
        step="0.01"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <label htmlFor="paid_date">Paid date</label>
      <input
        id="paid_date"
        type="date"
        value={paidDate}
        onChange={(e) => setPaidDate(e.target.value)}
        required
      />

      <label htmlFor="method">Method</label>
      <input id="method" value={method} onChange={(e) => setMethod(e.target.value)} />

      <label htmlFor="payment_notes">Notes</label>
      <textarea id="payment_notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save payment'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
