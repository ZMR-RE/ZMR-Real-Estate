import { useState } from 'react'
import type { VendorEstimate } from './vendorEstimatesQueries'

interface ChooseWinnerFormProps {
  estimates: VendorEstimate[]
  currentChosenId: string | null
  saving: boolean
  onChoose: (estimateId: string, decisionNotes: string | null) => void
  onCancel: () => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Roadmap 8.11(b) — "which one was chosen and why." Pre-selects the
// job's current winner if it already has one (re-choosing is allowed,
// not a one-time lock).
export function ChooseWinnerForm({ estimates, currentChosenId, saving, onChoose, onCancel }: ChooseWinnerFormProps) {
  const [selectedId, setSelectedId] = useState(currentChosenId ?? estimates[0]?.id ?? '')
  const [decisionNotes, setDecisionNotes] = useState('')

  return (
    <div className="inline-form">
      <label htmlFor="choose_winner_estimate">
        Winning estimate<span className="required-marker">*</span>
      </label>
      <select id="choose_winner_estimate" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        {estimates.map((estimate) => (
          <option key={estimate.id} value={estimate.id}>
            {estimate.vendor.name} — {currencyFormatter.format(estimate.amount)} ({estimate.estimate_date})
          </option>
        ))}
      </select>

      <label htmlFor="choose_winner_notes">Why</label>
      <textarea
        id="choose_winner_notes"
        placeholder="e.g. Best price, fastest availability, good references"
        value={decisionNotes}
        onChange={(e) => setDecisionNotes(e.target.value)}
      />

      <button
        type="button"
        disabled={saving || !selectedId}
        onClick={() => onChoose(selectedId, decisionNotes.trim() || null)}
      >
        {saving ? 'Saving…' : 'Confirm choice'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
