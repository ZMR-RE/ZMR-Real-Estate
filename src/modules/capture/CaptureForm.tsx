import type { FormEvent } from 'react'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { useCaptureForm } from './useCaptureForm'
import type { EntryType } from './captureQueries'

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'visit', label: 'Visit' },
  { value: 'communication', label: 'Communication' },
]

export function CaptureForm() {
  const {
    propertyOptions,
    entryType,
    setEntryType,
    propertyId,
    setPropertyId,
    entryDate,
    setEntryDate,
    notes,
    setNotes,
    file,
    setFile,
    submitting,
    error,
    savedAt,
    submit,
  } = useCaptureForm()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Quick Capture</h1>

      <div role="group" aria-label="Type">
        {ENTRY_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            aria-pressed={entryType === type.value}
            onClick={() => setEntryType(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>

      <label htmlFor="property">Property</label>
      <SearchableSelect
        options={propertyOptions}
        value={propertyId}
        onChange={setPropertyId}
        placeholder="Search properties…"
      />

      <label htmlFor="entry_date">Date</label>
      <input
        id="entry_date"
        type="date"
        value={entryDate}
        onChange={(e) => setEntryDate(e.target.value)}
        required
      />

      <label htmlFor="notes">Notes (optional)</label>
      <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <label htmlFor="attachment">Attachment (photo or PDF)</label>
      <input
        key={savedAt ?? 'initial'}
        id="attachment"
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {file && <p>Selected: {file.name}</p>}

      {error && <p role="alert">{error}</p>}
      {savedAt && <p>Saved.</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Capture'}
      </button>
    </form>
  )
}
