import { useState } from 'react'
import { SearchableSelect, type SearchableSelectOption } from '../../shared/SearchableSelect'
import { formatAmountOnBlur, sanitizeAmountInput } from '../../shared/currencyInput'
import { VendorForm } from '../vendors/VendorForm'
import type { VendorInput } from '../vendors/vendorsQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

interface VendorEstimateFormProps {
  vendorOptions: SearchableSelectOption[]
  onCreateVendor: (input: VendorInput) => Promise<{ id: string } | { error: string }>
  saving: boolean
  onSave: (input: { vendorId: string; amount: number; estimateDate: string; notes: string | null }) => void
  onCancel: () => void
}

// Roadmap 8.11(b) — log one quote for a job. Tracked by date (the
// roadmap item's own wording) — defaults to today, editable for
// backfilling a quote received earlier.
export function VendorEstimateForm({ vendorOptions, onCreateVendor, saving, onSave, onCancel }: VendorEstimateFormProps) {
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [isAddingVendor, setIsAddingVendor] = useState(false)
  const [creatingVendor, setCreatingVendor] = useState(false)
  const [createVendorError, setCreateVendorError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [estimateDate, setEstimateDate] = useState(todayDateString())
  const [notes, setNotes] = useState('')

  const handleCreateVendor = async (input: VendorInput) => {
    setCreatingVendor(true)
    const result = await onCreateVendor(input)
    setCreatingVendor(false)
    if ('error' in result) {
      setCreateVendorError(result.error)
      return
    }
    setCreateVendorError(null)
    setVendorId(result.id)
    setIsAddingVendor(false)
  }

  const parsedAmount = amount.trim() ? Number(amount) : null
  const canSave = Boolean(vendorId) && parsedAmount !== null && parsedAmount > 0 && Boolean(estimateDate)

  return (
    <div className="inline-form">
      <label htmlFor="vendor_estimate_vendor">
        Vendor<span className="required-marker">*</span>
      </label>
      {isAddingVendor ? (
        <VendorForm
          saving={creatingVendor}
          error={createVendorError}
          onSave={handleCreateVendor}
          onCancel={() => {
            setIsAddingVendor(false)
            setCreateVendorError(null)
          }}
        />
      ) : (
        <SearchableSelect
          options={vendorOptions}
          value={vendorId}
          onChange={setVendorId}
          placeholder="Select vendor"
          onAddNew={() => setIsAddingVendor(true)}
          addNewLabel="+ Add new vendor"
        />
      )}

      <label htmlFor="vendor_estimate_amount">
        Amount<span className="required-marker">*</span>
      </label>
      <input
        id="vendor_estimate_amount"
        type="number"
        min="0.01"
        step="0.01"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
        onBlur={(e) => setAmount(formatAmountOnBlur(e.target.value))}
      />

      <label htmlFor="vendor_estimate_date">
        Date<span className="required-marker">*</span>
      </label>
      <input
        id="vendor_estimate_date"
        type="date"
        required
        value={estimateDate}
        onChange={(e) => setEstimateDate(e.target.value)}
      />

      <label htmlFor="vendor_estimate_notes">Notes</label>
      <textarea
        id="vendor_estimate_notes"
        placeholder="Scope, terms, timeline…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <button
        type="button"
        disabled={saving || !canSave}
        onClick={() =>
          onSave({ vendorId: vendorId as string, amount: parsedAmount as number, estimateDate, notes: notes.trim() || null })
        }
      >
        {saving ? 'Saving…' : 'Log estimate'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
