import { useState, type FormEvent } from 'react'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import { formatAmountOnBlur, sanitizeAmountInput } from '../../shared/currencyInput'
import { VendorForm } from '../vendors/VendorForm'
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
//
// Roadmap 1.7 correction — 1.7 was checked off without actually building
// each type's own fields (this file previously rendered the same
// Property/Date/Notes/Attachments set for every type but Mileage). Added
// here: Receipt gets vendor/amount/category, Visit gets an optional "who
// was met with", Communication gets contact name/method/subject. All
// optional, same as every other field beyond type/property/date.
export function CaptureForm({ onCaptured }: CaptureFormProps) {
  const {
    propertyOptions,
    propertiesLoading,
    entryType,
    setEntryType,
    propertyId,
    setPropertyId,
    unitId,
    setUnitId,
    unitOptions,
    entryDate,
    setEntryDate,
    notes,
    setNotes,
    milesDriven,
    setMilesDriven,
    startDestination,
    setStartDestination,
    endDestination,
    setEndDestination,
    tripOptions,
    selectTrip,
    vendorId,
    setVendorId,
    vendorOptions,
    onCreateVendor,
    amount,
    setAmount,
    category,
    setCategory,
    financialAccountId,
    setFinancialAccountId,
    financialAccountOptions,
    paymentMethod,
    setPaymentMethod,
    repairOrImprovement,
    setRepairOrImprovement,
    metWith,
    setMetWith,
    visitType,
    setVisitType,
    contactName,
    setContactName,
    contactMethod,
    setContactMethod,
    subject,
    setSubject,
    files,
    addFiles,
    removeFile,
    submitting,
    error,
    savedAt,
    submit,
  } = useCaptureForm(onCaptured)

  const [isAddingVendor, setIsAddingVendor] = useState(false)
  const [creatingVendor, setCreatingVendor] = useState(false)
  const [createVendorError, setCreateVendorError] = useState<string | null>(null)

  const handleCreateVendor = async (input: Parameters<typeof onCreateVendor>[0]) => {
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
  }

  return (
    <form className="capture-form" onSubmit={handleSubmit}>
      <label id="type_label">
        Type<span className="required-marker">*</span>
      </label>
      <div className="type-selector" role="group" aria-labelledby="type_label">
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
          <label htmlFor="property">
            Property<span className="required-marker">*</span>
          </label>
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

          {entryType === 'receipt' && unitOptions.length > 0 && (
            <>
              <label htmlFor="unit">Unit</label>
              <SearchableSelect
                options={unitOptions}
                value={unitId}
                onChange={setUnitId}
                placeholder="Search units…"
              />
            </>
          )}

          <label htmlFor="entry_date">
            Date<span className="required-marker">*</span>
          </label>
          <input
            id="entry_date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />

          {entryType === 'mileage' && (
            <>
              {tripOptions.length > 0 && (
                <>
                  <label htmlFor="trip">Use a previous trip</label>
                  <select
                    id="trip"
                    value=""
                    onChange={(e) => {
                      const trip = tripOptions.find((t) => t.id === e.target.value)
                      if (trip) selectTrip(trip)
                    }}
                  >
                    <option value="">Select a trip…</option>
                    {tripOptions.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.start_destination} → {trip.end_destination} ({trip.miles} mi)
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label htmlFor="start_destination">Start destination</label>
              <input
                id="start_destination"
                value={startDestination}
                onChange={(e) => setStartDestination(e.target.value)}
              />

              <label htmlFor="end_destination">End destination</label>
              <input id="end_destination" value={endDestination} onChange={(e) => setEndDestination(e.target.value)} />

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

          {entryType === 'receipt' && (
            <>
              <label htmlFor="vendor">Vendor</label>
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
                  placeholder="Search vendors…"
                  onAddNew={() => setIsAddingVendor(true)}
                  addNewLabel="+ Add vendor"
                />
              )}

              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                onBlur={(e) => setAmount(formatAmountOnBlur(e.target.value))}
              />

              <label htmlFor="category">Category</label>
              <PickListSelect
                id="category"
                listName="subcategory"
                title="Subcategories"
                value={category}
                onChange={setCategory}
                placeholder="Select category…"
              />

              <label htmlFor="financial_account">Payment method</label>
              <SearchableSelect
                options={financialAccountOptions}
                value={financialAccountId}
                onChange={setFinancialAccountId}
                placeholder="Search financial accounts…"
              />

              {financialAccountId && (
                <>
                  <label htmlFor="payment_how">How</label>
                  <PickListSelect
                    id="payment_how"
                    listName="payment_how"
                    title="Payment how"
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    placeholder="Select how…"
                  />
                </>
              )}

              <label htmlFor="repair_or_improvement">Repair/Improvement</label>
              <select
                id="repair_or_improvement"
                value={repairOrImprovement}
                onChange={(e) => setRepairOrImprovement(e.target.value)}
              >
                <option value="">—</option>
                <option value="repair">Repair</option>
                <option value="improvement">Improvement</option>
              </select>
            </>
          )}

          {entryType === 'visit' && (
            <>
              <label htmlFor="met_with">Who was met with</label>
              <input id="met_with" value={metWith} onChange={(e) => setMetWith(e.target.value)} />

              <label htmlFor="visit_type">Visit type</label>
              <PickListSelect
                id="visit_type"
                listName="visit_type"
                title="Visit types"
                value={visitType}
                onChange={setVisitType}
                placeholder="Select visit type…"
              />
            </>
          )}

          {entryType === 'communication' && (
            <>
              <label htmlFor="contact_name">Contact name</label>
              <input id="contact_name" value={contactName} onChange={(e) => setContactName(e.target.value)} />

              <label htmlFor="contact_method">Method</label>
              <PickListSelect
                id="contact_method"
                listName="contact_method"
                title="Contact methods"
                value={contactMethod}
                onChange={setContactMethod}
                placeholder="Select method…"
              />

              <label htmlFor="subject">Subject</label>
              <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </>
          )}

          <label htmlFor="notes">{entryType === 'mileage' ? 'Purpose' : 'Notes'}</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <label htmlFor="attachment">Attachments (up to {MAX_ATTACHMENTS_PER_ENTRY})</label>
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
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </>
      )}
    </form>
  )
}
