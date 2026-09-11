import type { FormEvent } from 'react'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { useMileageEntryForm } from './useMileageEntryForm'

export function MileageLogForm() {
  const {
    propertyOptions,
    propertiesLoading,
    propertyId,
    setPropertyId,
    logDate,
    setLogDate,
    miles,
    setMiles,
    purpose,
    setPurpose,
    submitting,
    error,
    savedAt,
    submit,
  } = useMileageEntryForm()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
  }

  return (
    <form className="mileage-log-form" onSubmit={handleSubmit}>
      <h2>Mileage log</h2>

      <label htmlFor="mileage_property">Property</label>
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

      <label htmlFor="mileage_date">Date</label>
      <input
        id="mileage_date"
        type="date"
        value={logDate}
        onChange={(e) => setLogDate(e.target.value)}
        required
      />

      <label htmlFor="mileage_miles">Miles driven</label>
      <input
        id="mileage_miles"
        type="number"
        min="0.1"
        step="0.1"
        inputMode="decimal"
        value={miles}
        onChange={(e) => setMiles(e.target.value)}
        required
      />

      <label htmlFor="mileage_purpose">Purpose / notes</label>
      <textarea id="mileage_purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />

      {error && <p role="alert">{error}</p>}
      {savedAt && <p className="success-message">Saved.</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Log mileage'}
      </button>
    </form>
  )
}
