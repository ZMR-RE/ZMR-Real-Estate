import { useState } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import { MAX_ATTACHMENTS_PER_ENTRY, type CaptureEntry } from './captureQueries'

export interface CaptureEntryDetailsInput {
  notes: string
  milesDriven: string
  vendor: string
  amount: string
  category: string
  metWith: string
  contactName: string
  contactMethod: string
  subject: string
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
// the Quick Capture create form itself. Mirrors CaptureForm.tsx's
// per-type fields (roadmap 1.7 correction) so a field skipped at capture
// time can still be filled in later here, the same way notes/miles
// driven always could.
export function CaptureEntryDetailsForm({ entry, saving, error, onSave, onCancel }: CaptureEntryDetailsFormProps) {
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [milesDriven, setMilesDriven] = useState(entry.miles_driven ?? '')
  const [vendor, setVendor] = useState(entry.vendor ?? '')
  const [amount, setAmount] = useState(entry.amount ?? '')
  const [category, setCategory] = useState(entry.category ?? '')
  const [metWith, setMetWith] = useState(entry.met_with ?? '')
  const [contactName, setContactName] = useState(entry.contact_name ?? '')
  const [contactMethod, setContactMethod] = useState(entry.contact_method ?? '')
  const [subject, setSubject] = useState(entry.subject ?? '')
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

      {entry.entry_type === 'receipt' && (
        <>
          <label htmlFor={`vendor_${entry.id}`}>Vendor</label>
          <input id={`vendor_${entry.id}`} value={vendor} onChange={(e) => setVendor(e.target.value)} />

          <label htmlFor={`amount_${entry.id}`}>Amount</label>
          <input
            id={`amount_${entry.id}`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <label htmlFor={`category_${entry.id}`}>Category</label>
          <PickListSelect
            id={`category_${entry.id}`}
            listName="subcategory"
            title="Subcategories"
            value={category}
            onChange={setCategory}
            placeholder="Select category…"
          />
        </>
      )}

      {entry.entry_type === 'visit' && (
        <>
          <label htmlFor={`met_with_${entry.id}`}>Who was met with</label>
          <input id={`met_with_${entry.id}`} value={metWith} onChange={(e) => setMetWith(e.target.value)} />
        </>
      )}

      {entry.entry_type === 'communication' && (
        <>
          <label htmlFor={`contact_name_${entry.id}`}>Contact name</label>
          <input
            id={`contact_name_${entry.id}`}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />

          <label htmlFor={`contact_method_${entry.id}`}>Method</label>
          <PickListSelect
            id={`contact_method_${entry.id}`}
            listName="contact_method"
            title="Contact methods"
            value={contactMethod}
            onChange={setContactMethod}
            placeholder="Select method…"
          />

          <label htmlFor={`subject_${entry.id}`}>Subject</label>
          <input id={`subject_${entry.id}`} value={subject} onChange={(e) => setSubject(e.target.value)} />
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

      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onSave({ notes, milesDriven, vendor, amount, category, metWith, contactName, contactMethod, subject, newFiles })
        }
      >
        {saving ? 'Saving…' : 'Save details'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
