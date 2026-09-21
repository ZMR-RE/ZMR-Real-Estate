import { useEffect, useState } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import { SearchableSelect, type SearchableSelectOption } from '../../shared/SearchableSelect'
import { formatAmountOnBlur, sanitizeAmountInput } from '../../shared/currencyInput'
import { listUnits } from '../units/unitsQueries'
import { listFinancialAccounts } from '../financialAccounts/financialAccountsQueries'
import { listAllTenantsForProperty } from '../tenants/propertyTenantsQueries'
import { listProspectiveTenantsForProperty, createProspectiveTenant, type ProspectiveTenantInput } from '../tenants/prospectiveTenantsQueries'
import { ProspectiveTenantForm } from '../tenants/ProspectiveTenantForm'
import { VendorForm } from '../vendors/VendorForm'
import type { VendorInput } from '../vendors/vendorsQueries'
import { MAX_ATTACHMENTS_PER_ENTRY, type CaptureEntry } from './captureQueries'

export interface CaptureEntryDetailsInput {
  notes: string
  milesDriven: string
  startDestination: string
  endDestination: string
  unitId: string
  vendorId: string
  amount: string
  category: string
  financialAccountId: string
  paymentMethod: string
  repairOrImprovement: string
  metWith: string
  metWithVendorId: string
  metWithTenantId: string
  metWithProspectiveTenantId: string
  visitType: string
  contactName: string
  contactMethod: string
  subject: string
  newFiles: File[]
}

interface CaptureEntryDetailsFormProps {
  entry: CaptureEntry
  accountId: string | null
  saving: boolean
  error: string | null
  vendorOptions: SearchableSelectOption[]
  onCreateVendor: (input: VendorInput) => Promise<{ id: string } | { error: string }>
  onSave: (input: CaptureEntryDetailsInput) => void
  onCancel: () => void
}

// Roadmap 1.11 — the "fill in the rest" form, shared by Quick Capture's
// Recently logged list and the Reconciliation Queue. Never rendered from
// the Quick Capture create form itself. Mirrors CaptureForm.tsx's
// per-type fields (roadmap 1.7 correction) so a field skipped at capture
// time can still be filled in later here, the same way notes/miles
// driven always could.
export function CaptureEntryDetailsForm({
  entry,
  accountId,
  saving,
  error,
  vendorOptions,
  onCreateVendor,
  onSave,
  onCancel,
}: CaptureEntryDetailsFormProps) {
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [milesDriven, setMilesDriven] = useState(entry.miles_driven ?? '')
  const [startDestination, setStartDestination] = useState(entry.start_destination ?? '')
  const [endDestination, setEndDestination] = useState(entry.end_destination ?? '')
  const [unitId, setUnitId] = useState(entry.unit_id ?? '')
  const [unitOptions, setUnitOptions] = useState<SearchableSelectOption[]>([])
  const [vendorId, setVendorId] = useState(entry.vendor_id ?? '')
  const [amount, setAmount] = useState(entry.amount ?? '')
  const [category, setCategory] = useState(entry.category ?? '')
  const [financialAccountId, setFinancialAccountIdState] = useState(entry.financial_account_id ?? '')
  const [financialAccountOptions, setFinancialAccountOptions] = useState<SearchableSelectOption[]>([])
  const [paymentMethod, setPaymentMethod] = useState(entry.payment_method ?? '')

  const setFinancialAccountId = (id: string | null) => {
    setFinancialAccountIdState(id ?? '')
    setPaymentMethod('')
  }
  const [repairOrImprovement, setRepairOrImprovement] = useState(entry.repair_or_improvement ?? '')
  const [tenantOptions, setTenantOptions] = useState<SearchableSelectOption[]>([])
  const [prospectiveTenantOptions, setProspectiveTenantOptions] = useState<SearchableSelectOption[]>([])
  const [metWithVendorId, setMetWithVendorId] = useState(entry.met_with_vendor_id ?? '')
  const [metWithTenantId, setMetWithTenantId] = useState(entry.met_with_tenant_id ?? '')
  const [metWithProspectiveTenantId, setMetWithProspectiveTenantId] = useState(entry.met_with_prospective_tenant_id ?? '')
  const [visitType, setVisitType] = useState(entry.visit_type ?? '')
  const [contactName, setContactName] = useState(entry.contact_name ?? '')
  const [contactMethod, setContactMethod] = useState(entry.contact_method ?? '')
  const [subject, setSubject] = useState(entry.subject ?? '')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [isAddingVendor, setIsAddingVendor] = useState(false)
  const [creatingVendor, setCreatingVendor] = useState(false)
  const [createVendorError, setCreateVendorError] = useState<string | null>(null)
  const remainingSlots = MAX_ATTACHMENTS_PER_ENTRY - entry.attachments.length

  // Roadmap 1.16 — Unit, scoped to this entry's own (fixed, non-editable
  // here) property. Fetched per-instance rather than threaded down as a
  // prop since every row in a list of entries has a different property.
  useEffect(() => {
    if (!accountId || entry.entry_type !== 'receipt') return
    listUnits(accountId, entry.property.id).then(({ data }) => {
      setUnitOptions((data ?? []).map((u) => ({ id: u.id, label: u.unit_label })))
    })
  }, [accountId, entry.entry_type, entry.property.id])

  // Roadmap 1.16 correction — Financial account, scoped to this entry's
  // own (fixed, non-editable here) property, same pattern as Unit above.
  const refreshFinancialAccountOptions = () => {
    if (!accountId || entry.entry_type !== 'receipt') return
    listFinancialAccounts(accountId, entry.property.id).then(({ data }) => {
      setFinancialAccountOptions(
        (data ?? [])
          .filter((a) => !a.archived)
          .map((a) => ({ id: a.id, label: `${a.nickname} ...${a.last_four}` })),
      )
    })
  }

  useEffect(() => {
    refreshFinancialAccountOptions()
  }, [accountId, entry.entry_type, entry.property.id])

  // Roadmap 1.28 — tenant options for this entry's own (fixed) property,
  // same pattern as Unit/Financial account above; needed for Visit's
  // "who was met with" picker.
  useEffect(() => {
    if (!accountId || entry.entry_type !== 'visit') return
    listAllTenantsForProperty(accountId, entry.property.id).then(({ data }) => {
      setTenantOptions((data ?? []).map((t) => ({ id: t.id, label: t.name })))
    })
  }, [accountId, entry.entry_type, entry.property.id])

  // Roadmap 1.28 revision — potential tenants, same pattern as Tenant
  // above.
  useEffect(() => {
    if (!accountId || entry.entry_type !== 'visit') return
    listProspectiveTenantsForProperty(accountId, entry.property.id).then(({ data }) => {
      setProspectiveTenantOptions((data ?? []).map((t) => ({ id: t.id, label: t.name })))
    })
  }, [accountId, entry.entry_type, entry.property.id])

  const metWithEntityId = metWithVendorId || metWithTenantId || metWithProspectiveTenantId || null
  const metWithOptions: SearchableSelectOption[] = [
    ...vendorOptions.map((v) => ({ ...v, group: 'Vendors' })),
    ...tenantOptions.map((t) => ({ ...t, group: 'Tenants' })),
    ...prospectiveTenantOptions.map((t) => ({ ...t, group: 'Potential tenants' })),
  ]
  const selectMetWithEntity = (id: string) => {
    if (vendorOptions.some((v) => v.id === id)) {
      setMetWithVendorId(id)
      setMetWithTenantId('')
      setMetWithProspectiveTenantId('')
    } else if (tenantOptions.some((t) => t.id === id)) {
      setMetWithTenantId(id)
      setMetWithVendorId('')
      setMetWithProspectiveTenantId('')
    } else {
      setMetWithProspectiveTenantId(id)
      setMetWithVendorId('')
      setMetWithTenantId('')
    }
  }

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

  // Roadmap 1.28 revision — Visit's "who was met with" picker gets its
  // own inline "+ Add new vendor", separate state from Receipt's Vendor
  // field above since the two land in different fields (vendorId vs
  // metWithVendorId).
  const [isAddingMetWithVendor, setIsAddingMetWithVendor] = useState(false)
  const [creatingMetWithVendor, setCreatingMetWithVendor] = useState(false)
  const [createMetWithVendorError, setCreateMetWithVendorError] = useState<string | null>(null)

  const handleCreateMetWithVendor = async (input: VendorInput) => {
    setCreatingMetWithVendor(true)
    const result = await onCreateVendor(input)
    setCreatingMetWithVendor(false)

    if ('error' in result) {
      setCreateMetWithVendorError(result.error)
      return
    }

    setCreateMetWithVendorError(null)
    setMetWithVendorId(result.id)
    setMetWithTenantId('')
    setMetWithProspectiveTenantId('')
    setIsAddingMetWithVendor(false)
  }

  // Roadmap 1.28 addition — same picker's "+ Add potential tenant".
  const [isAddingProspectiveTenant, setIsAddingProspectiveTenant] = useState(false)
  const [creatingProspectiveTenant, setCreatingProspectiveTenant] = useState(false)
  const [createProspectiveTenantError, setCreateProspectiveTenantError] = useState<string | null>(null)

  const handleCreateProspectiveTenant = async (input: ProspectiveTenantInput) => {
    if (!accountId) return
    setCreatingProspectiveTenant(true)
    const { data, error: saveError } = await createProspectiveTenant(accountId, entry.property.id, input)
    setCreatingProspectiveTenant(false)

    if (saveError || !data) {
      setCreateProspectiveTenantError(saveError?.message ?? 'Could not add potential tenant.')
      return
    }

    setCreateProspectiveTenantError(null)
    setProspectiveTenantOptions((prev) =>
      [...prev, { id: data.id, label: data.name }].sort((a, b) => a.label.localeCompare(b.label)),
    )
    setMetWithProspectiveTenantId(data.id)
    setMetWithVendorId('')
    setMetWithTenantId('')
    setIsAddingProspectiveTenant(false)
  }

  return (
    <div className="capture-entry-details-form">
      {entry.entry_type === 'mileage' && (
        <>
          <label htmlFor={`start_destination_${entry.id}`}>Start destination</label>
          <input
            id={`start_destination_${entry.id}`}
            value={startDestination}
            onChange={(e) => setStartDestination(e.target.value)}
          />

          <label htmlFor={`end_destination_${entry.id}`}>End destination</label>
          <input
            id={`end_destination_${entry.id}`}
            value={endDestination}
            onChange={(e) => setEndDestination(e.target.value)}
          />

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
          {unitOptions.length > 0 && (
            <>
              <label htmlFor={`unit_${entry.id}`}>Unit</label>
              <SearchableSelect
                options={unitOptions}
                value={unitId || null}
                onChange={setUnitId}
                placeholder="Search units…"
              />
            </>
          )}

          <label htmlFor={`vendor_${entry.id}`}>Vendor</label>
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
              value={vendorId || null}
              onChange={setVendorId}
              placeholder="Search vendors…"
              onAddNew={() => setIsAddingVendor(true)}
              addNewLabel="+ Add vendor"
            />
          )}

          <label htmlFor={`amount_${entry.id}`}>Amount</label>
          <input
            id={`amount_${entry.id}`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
            onBlur={(e) => setAmount(formatAmountOnBlur(e.target.value))}
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

          <label htmlFor={`financial_account_${entry.id}`}>Payment method</label>
          <SearchableSelect
            options={financialAccountOptions}
            value={financialAccountId || null}
            onChange={setFinancialAccountId}
            onOpen={refreshFinancialAccountOptions}
            placeholder="Search financial accounts…"
          />

          {financialAccountId && (
            <>
              <label htmlFor={`payment_how_${entry.id}`}>How</label>
              <PickListSelect
                id={`payment_how_${entry.id}`}
                listName="payment_how"
                title="Payment how"
                value={paymentMethod}
                onChange={setPaymentMethod}
                placeholder="Select how…"
              />
            </>
          )}

          <label htmlFor={`repair_or_improvement_${entry.id}`}>Repair/Improvement</label>
          <select
            id={`repair_or_improvement_${entry.id}`}
            value={repairOrImprovement}
            onChange={(e) => setRepairOrImprovement(e.target.value)}
          >
            <option value="">—</option>
            <option value="repair">Repair</option>
            <option value="improvement">Improvement</option>
          </select>
        </>
      )}

      {entry.entry_type === 'visit' && (
        <>
          <label htmlFor={`met_with_${entry.id}`}>Who was met with</label>
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
          ) : isAddingProspectiveTenant ? (
            <ProspectiveTenantForm
              saving={creatingProspectiveTenant}
              error={createProspectiveTenantError}
              onSave={handleCreateProspectiveTenant}
              onCancel={() => {
                setIsAddingProspectiveTenant(false)
                setCreateProspectiveTenantError(null)
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
              onAddNewSecondary={() => setIsAddingProspectiveTenant(true)}
              addNewSecondaryLabel="+ Add potential tenant"
            />
          )}

          <label htmlFor={`visit_type_${entry.id}`}>Visit type</label>
          <PickListSelect
            id={`visit_type_${entry.id}`}
            listName="visit_type"
            title="Visit types"
            value={visitType}
            onChange={setVisitType}
            placeholder="Select visit type…"
          />
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
          onSave({
            notes,
            milesDriven,
            startDestination,
            endDestination,
            unitId,
            vendorId,
            amount,
            category,
            financialAccountId,
            paymentMethod,
            repairOrImprovement,
            metWith: '',
            metWithVendorId,
            metWithTenantId,
            metWithProspectiveTenantId,
            visitType,
            contactName,
            contactMethod,
            subject,
            newFiles,
          })
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
