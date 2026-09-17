import { useState } from 'react'
import { MAX_ATTACHMENTS_PER_ENTRY, type CaptureEntry } from './captureQueries'

export interface CaptureEntryDetailsInput {
  notes: string
  milesDriven: string
  newFiles: File[]
}

interface CaptureEntryDetailsFormProps {
  entry: CaptureEntry
  saving: boolean
  error: string | null
  onSave: (input: CaptureEntryDetailsInput) => void
  onCancel: () => void
}

// Roadmap 1.11 — the "fill in the rest" form, shared by Quick Capture's
// Recently logged list and the Reconciliation Queue. Never rendered from
// the Quick Capture create form itself.
export function CaptureEntryDetailsForm({ entry, saving, error, onSave, onCancel }: CaptureEntryDetailsFormProps) {
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [milesDriven, setMilesDriven] = useState(entry.miles_driven ?? '')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const remainingSlots = MAX_ATTACHMENTS_PER_ENTRY - entry.attachments.length

  return (
    <div className="capture-entry-details-form">
      {entry.entry_type === 'mileage' && (
        <>
          <label htmlFor={`miles_${entry.id}`}>Miles driven</label>
          <input
            id={`miles_${entry.id}`}
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={milesDriven}
            onChange={(e) => setMilesDriven(e.target.value)}
          />
        </>
      )}

      <label htmlFor={`notes_${entry.id}`}>{entry.entry_type === 'mileage' ? 'Purpose' : 'Notes'}</label>
      <textarea id={`notes_${entry.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} />

      {remainingSlots > 0 && (
        <>
          <label htmlFor={`files_${entry.id}`}>Add attachments</label>
          <input
            id={`files_${entry.id}`}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={(e) => setNewFiles(Array.from(e.target.files ?? []).slice(0, remainingSlots))}
          />
        </>
      )}

      {error && <p role="alert">{error}</p>}

      <button type="button" disabled={saving} onClick={() => onSave({ notes, milesDriven, newFiles })}>
        {saving ? 'Saving…' : 'Save details'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
