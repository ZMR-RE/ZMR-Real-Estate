import { useState, type FormEvent } from 'react'
import { SearchableSelect } from '../../shared/SearchableSelect'
import type { InvoiceInput } from './rentOpsQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

interface InvoiceFormProps {
  propertyOptions: { id: string; label: string }[]
  saving: boolean
  onSave: (input: InvoiceInput) => void
  onCancel: () => void
}

export function InvoiceForm({ propertyOptions, saving, onSave, onCancel }: InvoiceFormProps) {
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [billedTo, setBilledTo] = useState('')
  const [periodStart, setPeriodStart] = useState(todayDateString())
  const [periodEnd, setPeriodEnd] = useState(todayDateString())
  const [amountDue, setAmountDue] = useState('')
  const [dueDate, setDueDate] = useState(todayDateString())
  const [notes, setNotes] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!propertyId) return

    onSave({
      propertyId,
      billedTo: billedTo.trim() || null,
      periodStart,
      periodEnd,
      amountDue,
      dueDate,
      notes: notes.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>New invoice</h2>

      <label htmlFor="invoice_property">Property</label>
      <SearchableSelect
        options={propertyOptions}
        value={propertyId}
        onChange={setPropertyId}
        placeholder="Search properties…"
      />

      <label htmlFor="billed_to">Billed to</label>
      <input id="billed_to" value={billedTo} onChange={(e) => setBilledTo(e.target.value)} />

      <label htmlFor="period_start">Period start</label>
      <input
        id="period_start"
        type="date"
        value={periodStart}
        onChange={(e) => setPeriodStart(e.target.value)}
        required
      />

      <label htmlFor="period_end">Period end</label>
      <input
        id="period_end"
        type="date"
        value={periodEnd}
        onChange={(e) => setPeriodEnd(e.target.value)}
        required
      />

      <label htmlFor="amount_due">Amount due</label>
      <input
        id="amount_due"
        type="number"
        step="0.01"
        min="0"
        value={amountDue}
        onChange={(e) => setAmountDue(e.target.value)}
        required
      />

      <label htmlFor="due_date">Due date</label>
      <input
        id="due_date"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        required
      />

      <label htmlFor="invoice_notes">Notes</label>
      <textarea id="invoice_notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <button type="submit" disabled={saving || !propertyId}>
        {saving ? 'Saving…' : 'Create invoice'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
