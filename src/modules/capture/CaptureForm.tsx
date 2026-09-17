import type { FormEvent } from 'react'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { useCaptureForm } from './useCaptureForm'
import { MAX_ATTACHMENTS_PER_ENTRY, type EntryType } from './captureQueries'

interface CaptureFormProps {
  onCaptured?: () => void
}

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'visit', label: 'Visit' },
  { value: 'communication', label: 'Communication' },
  { value: 'mileage', label: 'Mileage' },
]

// Roadmap 1.5/1.6 — "Quick capture" (not "Log it"), and type selection
// gates everything else: no property/date/type-specific fields render
// until a type is chosen, and each type only shows what's relevant to
// it (Mileage gets "Miles driven" and a "Purpose" label on the shared
// notes field instead of Receipt/Visit/Communication's "Notes").
export function CaptureForm({ onCaptured }: CaptureFormProps) {
  const {
    propertyOptions,
    propertiesLoading,
    entryType,
    setEntryType,
    propertyId,
    setPropertyId,
    entryDate,
    setEntryDate,
    notes,
    setNotes,
    milesDriven,
    setMilesDriven,
    files,
    addFiles,
    removeFile,
    submitting,
    error,
    savedAt,
    submit,
  } = useCaptureForm(onCaptured)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
  }

  return (
    <form className="capture-form" onSubmit={handleSubmit}>
      <div className="type-selector" role="group" aria-label="Type">
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

      {entryType && (
        <>
          <label htmlFor="property">Property</label>
          {propertiesLoading ? (
            <p>Loading properties…</p>
          ) : (
            <SearchableSelect
              options={propertyOptions}
              value={propertyId}
              onChange={setPropertyId}
              placeholder="Search properties…"
            />
          )}

          <label htmlFor="entry_date">Date</label>
          <input
            id="entry_date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />

          {entryType === 'mileage' && (
            <>
              <label htmlFor="miles_driven">Miles driven</label>
              <input
                id="miles_driven"
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={milesDriven}
                onChange={(e) => setMilesDriven(e.target.value)}
              />
            </>
          )}

          <label htmlFor="notes">{entryType === 'mileage' ? 'Purpose (optional)' : 'Notes (optional)'}</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <label htmlFor="attachment">Attachments (optional, up to {MAX_ATTACHMENTS_PER_ENTRY})</label>
          <input
            key={savedAt ?? 'initial'}
            id="attachment"
            type="file"
            accept="image/*,application/pdf"
            multiple
            disabled={files.length >= MAX_ATTACHMENTS_PER_ENTRY}
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
          {files.length > 0 && (
            <ul className="capture-attachment-list">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  {f.name}
                  <button type="button" onClick={() => removeFile(i)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p role="alert">{error}</p>}
          {savedAt && <p className="success-message">Saved.</p>}

          <button type="submit" disabled={submitting || !propertyId}>
            {submitting ? 'Saving…' : 'Capture'}
          </button>
        </>
      )}
    </form>
  )
}
