import { useState, type FormEvent } from 'react'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import { formatAmountOnBlur, sanitizeAmountInput } from '../../shared/currencyInput'
import { VendorForm } from '../vendors/VendorForm'
import { ProspectiveTenantForm } from '../tenants/ProspectiveTenantForm'
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
    onCreateVendor,
    amount,
    setAmount,
    category,
    setCategory,
    financialAccountId,
    setFinancialAccountId,
    financialAccountOptions,
    refreshFinancialAccountOptions,
    paymentMethod,
    setPaymentMethod,
    repairOrImprovement,
    setRepairOrImprovement,
    entryDirection,
    setEntryDirection,
    paidToOptions,
    paidToEntityId,
    refreshPaidToOptions,
    selectPaidToEntity,
    selectNewPaidToVendor,
    selectNewPaidToProspectiveTenant,
    metWithOptions,
    metWithEntityId,
    selectMetWithEntity,
    selectNewMetWithVendor,
    selectNewMetWithProspectiveTenant,
    onCreateProspectiveTenant,
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

  // Roadmap 1.31 — Receipt's "Paid to"/"Received from" picker gets its
  // own inline "+ Add new vendor", separate state from Visit's "who was
  // met with" below since the two fields' creation flows land in
  // different places (paidToVendorId vs metWithVendorId).
  const [isAddingPaidToVendor, setIsAddingPaidToVendor] = useState(false)
  const [creatingPaidToVendor, setCreatingPaidToVendor] = useState(false)
  const [createPaidToVendorError, setCreatePaidToVendorError] = useState<string | null>(null)

  const handleCreatePaidToVendor = async (input: Parameters<typeof onCreateVendor>[0]) => {
    setCreatingPaidToVendor(true)
    const result = await onCreateVendor(input)
    setCreatingPaidToVendor(false)

    if ('error' in result) {
      setCreatePaidToVendorError(result.error)
      return
    }

    setCreatePaidToVendorError(null)
    selectNewPaidToVendor(result.id)
    setIsAddingPaidToVendor(false)
  }

  // Roadmap 1.31 — same picker's "+ Add potential tenant".
  const [isAddingPaidToProspectiveTenant, setIsAddingPaidToProspectiveTenant] = useState(false)
  const [creatingPaidToProspectiveTenant, setCreatingPaidToProspectiveTenant] = useState(false)
  const [createPaidToProspectiveTenantError, setCreatePaidToProspectiveTenantError] = useState<string | null>(null)

  const handleCreatePaidToProspectiveTenant = async (input: Parameters<typeof onCreateProspectiveTenant>[0]) => {
    setCreatingPaidToProspectiveTenant(true)
    const result = await onCreateProspectiveTenant(input)
    setCreatingPaidToProspectiveTenant(false)

    if ('error' in result) {
      setCreatePaidToProspectiveTenantError(result.error)
      return
    }

    setCreatePaidToProspectiveTenantError(null)
    selectNewPaidToProspectiveTenant(result.id)
    setIsAddingPaidToProspectiveTenant(false)
  }

  // Roadmap 1.28 revision — Visit's "who was met with" picker gets its
  // own inline "+ Add new vendor" (same pattern as Receipt's "Paid to"/
  // "Received from" field above), separate state since the two fields'
  // creation flows land in different places (paidToVendorId vs
  // metWithVendorId).
  const [isAddingMetWithVendor, setIsAddingMetWithVendor] = useState(false)
  const [creatingMetWithVendor, setCreatingMetWithVendor] = useState(false)
  const [createMetWithVendorError, setCreateMetWithVendorError] = useState<string | null>(null)

  const handleCreateMetWithVendor = async (input: Parameters<typeof onCreateVendor>[0]) => {
    setCreatingMetWithVendor(true)
    const result = await onCreateVendor(input)
    setCreatingMetWithVendor(false)

    if ('error' in result) {
      setCreateMetWithVendorError(result.error)
      return
    }

    setCreateMetWithVendorError(null)
    selectNewMetWithVendor(result.id)
    setIsAddingMetWithVendor(false)
  }

  // Roadmap 1.28 addition — same picker's "+ Add potential tenant".
  const [isAddingMetWithProspectiveTenant, setIsAddingMetWithProspectiveTenant] = useState(false)
  const [creatingMetWithProspectiveTenant, setCreatingMetWithProspectiveTenant] = useState(false)
  const [createMetWithProspectiveTenantError, setCreateMetWithProspectiveTenantError] = useState<string | null>(null)

  const handleCreateMetWithProspectiveTenant = async (input: Parameters<typeof onCreateProspectiveTenant>[0]) => {
    setCreatingMetWithProspectiveTenant(true)
    const result = await onCreateProspectiveTenant(input)
    setCreatingMetWithProspectiveTenant(false)

    if ('error' in result) {
      setCreateMetWithProspectiveTenantError(result.error)
      return
    }

    setCreateMetWithProspectiveTenantError(null)
    selectNewMetWithProspectiveTenant(result.id)
    setIsAddingMetWithProspectiveTenant(false)
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
              <label htmlFor="entry_direction">Entry direction</label>
              <select
                id="entry_direction"
                value={entryDirection}
                onChange={(e) => setEntryDirection(e.target.value)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <label htmlFor="paid_to">{entryDirection === 'income' ? 'Received from' : 'Paid to'}</label>
              {isAddingPaidToVendor ? (
                <VendorForm
                  saving={creatingPaidToVendor}
                  error={createPaidToVendorError}
                  onSave={handleCreatePaidToVendor}
                  onCancel={() => {
                    setIsAddingPaidToVendor(false)
                    setCreatePaidToVendorError(null)
                  }}
                />
              ) : isAddingPaidToProspectiveTenant ? (
                <ProspectiveTenantForm
                  saving={creatingPaidToProspectiveTenant}
                  error={createPaidToProspectiveTenantError}
                  onSave={handleCreatePaidToProspectiveTenant}
                  onCancel={() => {
                    setIsAddingPaidToProspectiveTenant(false)
                    setCreatePaidToProspectiveTenantError(null)
                  }}
                />
              ) : (
                <SearchableSelect
                  options={paidToOptions}
                  value={paidToEntityId}
                  onChange={selectPaidToEntity}
                  onOpen={refreshPaidToOptions}
                  placeholder="Search vendors, tenants, and potential tenants…"
                  onAddNew={() => setIsAddingPaidToVendor(true)}
                  addNewLabel="+ Add new vendor"
                  onAddNewSecondary={() => setIsAddingPaidToProspectiveTenant(true)}
                  addNewSecondaryLabel="+ Add potential tenant"
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
                onOpen={refreshFinancialAccountOptions}
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
              <label htmlFor="met_with">Met with</label>
              {isAddingMetWithVendor ? (
                <VendorForm
                  saving={creatingMetWithVendor}
                  error={createMetWithVendorError}
                  onSave={handleCreateMetWithVendor}
                  onCancel={() => {
                    setIsAddingMetWithVendor(false)
                    setCreateMetWithVendorError(null)
                  }}
                />
              ) : isAddingMetWithProspectiveTenant ? (
                <ProspectiveTenantForm
                  saving={creatingMetWithProspectiveTenant}
                  error={createMetWithProspectiveTenantError}
                  onSave={handleCreateMetWithProspectiveTenant}
                  onCancel={() => {
                    setIsAddingMetWithProspectiveTenant(false)
                    setCreateMetWithProspectiveTenantError(null)
                  }}
                />
              ) : (
                <SearchableSelect
                  options={metWithOptions}
                  value={metWithEntityId}
                  onChange={selectMetWithEntity}
                  placeholder="Search vendors, tenants, and potential tenants…"
                  onAddNew={() => setIsAddingMetWithVendor(true)}
                  addNewLabel="+ Add new vendor"
                  onAddNewSecondary={() => setIsAddingMetWithProspectiveTenant(true)}
                  addNewSecondaryLabel="+ Add potential tenant"
                />
              )}

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
