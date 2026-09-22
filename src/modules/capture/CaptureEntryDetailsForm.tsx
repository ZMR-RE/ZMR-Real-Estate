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
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_LABELS } from '../financials/financialsQueries'

export interface CaptureEntryDetailsInput {
  notes: string
  milesDriven: string
  startDestination: string
  endDestination: string
  unitId: string
  amount: string
  category: string
  transactionCategory: string
  financialAccountId: string
  paymentMethod: string
  repairOrImprovement: string
  receiptType: string
  paidToVendorId: string
  paidToTenantId: string
  paidToProspectiveTenantId: string
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
  refreshVendorOptions: () => void
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
  refreshVendorOptions,
  onSave,
  onCancel,
}: CaptureEntryDetailsFormProps) {
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [milesDriven, setMilesDriven] = useState(entry.miles_driven ?? '')
  const [startDestination, setStartDestination] = useState(entry.start_destination ?? '')
  const [endDestination, setEndDestination] = useState(entry.end_destination ?? '')
  const [unitId, setUnitId] = useState(entry.unit_id ?? '')
  const [unitOptions, setUnitOptions] = useState<SearchableSelectOption[]>([])
  const [amount, setAmount] = useState(entry.amount ?? '')
  const [category, setCategory] = useState(entry.category ?? '')
  const [transactionCategory, setTransactionCategory] = useState(entry.transaction_category ?? '')
  const [financialAccountId, setFinancialAccountIdState] = useState(entry.financial_account_id ?? '')
  const [financialAccountOptions, setFinancialAccountOptions] = useState<SearchableSelectOption[]>([])
  const [paymentMethod, setPaymentMethod] = useState(entry.payment_method ?? '')

  const setFinancialAccountId = (id: string | null) => {
    setFinancialAccountIdState(id ?? '')
    setPaymentMethod('')
  }
  const [repairOrImprovement, setRepairOrImprovement] = useState(entry.repair_or_improvement ?? '')
  // Roadmap 1.31 — "Paid to"/"Received from" refinement's groundwork
  // (scoped narrowly, not full 1.33): defaults to 'expense' for a
  // pre-existing receipt saved before this field existed, matching
  // useCaptureForm.ts's create-time default.
  const [receiptType, setReceiptType] = useState(entry.receipt_type ?? 'expense')
  const [tenantOptions, setTenantOptions] = useState<SearchableSelectOption[]>([])
  const [prospectiveTenantOptions, setProspectiveTenantOptions] = useState<SearchableSelectOption[]>([])
  // Roadmap 1.31 — Receipt's "Vendor" field becomes the same
  // Vendors/Tenants/Potential-tenants picker Visit's "who was met with"
  // uses, mirrored exactly (own independent state, since the two are
  // semantically distinct relationships).
  const [paidToVendorId, setPaidToVendorId] = useState(entry.paid_to_vendor_id ?? '')
  const [paidToTenantId, setPaidToTenantId] = useState(entry.paid_to_tenant_id ?? '')
  const [paidToProspectiveTenantId, setPaidToProspectiveTenantId] = useState(
    entry.paid_to_prospective_tenant_id ?? '',
  )
  const [metWithVendorId, setMetWithVendorId] = useState(entry.met_with_vendor_id ?? '')
  const [metWithTenantId, setMetWithTenantId] = useState(entry.met_with_tenant_id ?? '')
  const [metWithProspectiveTenantId, setMetWithProspectiveTenantId] = useState(entry.met_with_prospective_tenant_id ?? '')
  const [visitType, setVisitType] = useState(entry.visit_type ?? '')
  const [contactName, setContactName] = useState(entry.contact_name ?? '')
  const [contactMethod, setContactMethod] = useState(entry.contact_method ?? '')
  const [subject, setSubject] = useState(entry.subject ?? '')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [isAddingPaidToVendor, setIsAddingPaidToVendor] = useState(false)
  const [creatingPaidToVendor, setCreatingPaidToVendor] = useState(false)
  const [createPaidToVendorError, setCreatePaidToVendorError] = useState<string | null>(null)
  const [isAddingPaidToProspectiveTenant, setIsAddingPaidToProspectiveTenant] = useState(false)
  const [creatingPaidToProspectiveTenant, setCreatingPaidToProspectiveTenant] = useState(false)
  const [createPaidToProspectiveTenantError, setCreatePaidToProspectiveTenantError] = useState<string | null>(null)
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
  // "who was met with" picker. Roadmap 1.31 widened this to Receipt too
  // (its "Paid to"/"Received from" picker needs the same options).
  const refreshTenantOptions = () => {
    if (!accountId || (entry.entry_type !== 'visit' && entry.entry_type !== 'receipt')) return
    listAllTenantsForProperty(accountId, entry.property.id).then(({ data }) => {
      setTenantOptions((data ?? []).map((t) => ({ id: t.id, label: t.name })))
    })
  }

  useEffect(refreshTenantOptions, [accountId, entry.entry_type, entry.property.id])

  // Roadmap 1.28 revision — potential tenants, same pattern as Tenant
  // above. Roadmap 1.31 widened this to Receipt too, same reasoning.
  const refreshProspectiveTenantOptions = () => {
    if (!accountId || (entry.entry_type !== 'visit' && entry.entry_type !== 'receipt')) return
    listProspectiveTenantsForProperty(accountId, entry.property.id).then(({ data }) => {
      setProspectiveTenantOptions((data ?? []).map((t) => ({ id: t.id, label: t.name })))
    })
  }

  useEffect(refreshProspectiveTenantOptions, [accountId, entry.entry_type, entry.property.id])

  // Cross-module data freshness (CLAUDE.md) — same gap Financial account
  // had before its onOpen refresh (refreshFinancialAccountOptions
  // above): vendor is account-wide and tenant/potential tenant are
  // property-scoped, but all three only ever re-fetch on mount, not when
  // this already-mounted row's picker is reopened. Wired to the "Paid
  // to"/"Received from" picker's onOpen — the flagged, pre-existing gap
  // on that specific picker (Visit's "Met with" picker isn't touched
  // here, out of this fix's scope).
  const refreshPaidToOptions = () => {
    refreshVendorOptions()
    refreshTenantOptions()
    refreshProspectiveTenantOptions()
  }

  // Roadmap 1.31 — Receipt's "Paid to"/"Received from" picker, exact
  // mirror of "who was met with" below.
  const paidToEntityId = paidToVendorId || paidToTenantId || paidToProspectiveTenantId || null
  const paidToOptions: SearchableSelectOption[] = [
    ...vendorOptions.map((v) => ({ ...v, group: 'Vendors' })),
    ...tenantOptions.map((t) => ({ ...t, group: 'Tenants' })),
    ...prospectiveTenantOptions.map((t) => ({ ...t, group: 'Potential tenants' })),
  ]
  const selectPaidToEntity = (id: string) => {
    if (vendorOptions.some((v) => v.id === id)) {
      setPaidToVendorId(id)
      setPaidToTenantId('')
      setPaidToProspectiveTenantId('')
    } else if (tenantOptions.some((t) => t.id === id)) {
      setPaidToTenantId(id)
      setPaidToVendorId('')
      setPaidToProspectiveTenantId('')
    } else {
      setPaidToProspectiveTenantId(id)
      setPaidToVendorId('')
      setPaidToTenantId('')
    }
  }

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

  const handleCreatePaidToVendor = async (input: VendorInput) => {
    setCreatingPaidToVendor(true)
    const result = await onCreateVendor(input)
    setCreatingPaidToVendor(false)

    if ('error' in result) {
      setCreatePaidToVendorError(result.error)
      return
    }

    setCreatePaidToVendorError(null)
    setPaidToVendorId(result.id)
    setPaidToTenantId('')
    setPaidToProspectiveTenantId('')
    setIsAddingPaidToVendor(false)
  }

  // Roadmap 1.31 — same picker's "+ Add potential tenant".
  const handleCreatePaidToProspectiveTenant = async (input: ProspectiveTenantInput) => {
    if (!accountId) return
    setCreatingPaidToProspectiveTenant(true)
    const { data, error: saveError } = await createProspectiveTenant(accountId, entry.property.id, input)
    setCreatingPaidToProspectiveTenant(false)

    if (saveError || !data) {
      setCreatePaidToProspectiveTenantError(saveError?.message ?? 'Could not add potential tenant.')
      return
    }

    setCreatePaidToProspectiveTenantError(null)
    setProspectiveTenantOptions((prev) =>
      [...prev, { id: data.id, label: data.name }].sort((a, b) => a.label.localeCompare(b.label)),
    )
    setPaidToProspectiveTenantId(data.id)
    setPaidToVendorId('')
    setPaidToTenantId('')
    setIsAddingPaidToProspectiveTenant(false)
  }

  // Roadmap 1.28 revision — Visit's "who was met with" picker gets its
  // own inline "+ Add new vendor", separate state from Receipt's "Paid
  // to"/"Received from" field above since the two land in different
  // fields (paidToVendorId vs metWithVendorId).
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

          <label htmlFor={`receipt_type_${entry.id}`}>Receipt type</label>
          <select
            id={`receipt_type_${entry.id}`}
            value={receiptType}
            onChange={(e) => setReceiptType(e.target.value)}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="refund_return">Refund/Return</option>
          </select>

          <label htmlFor={`paid_to_${entry.id}`}>{receiptType === 'expense' ? 'Paid to' : 'Received from'}</label>
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

          <label htmlFor={`transaction_category_${entry.id}`}>Category</label>
          <select
            id={`transaction_category_${entry.id}`}
            value={transactionCategory}
            onChange={(e) => setTransactionCategory(e.target.value)}
          >
            <option value="">Select category…</option>
            {(receiptType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>

          <label htmlFor={`category_${entry.id}`}>Subcategory</label>
          <PickListSelect
            id={`category_${entry.id}`}
            listName="subcategory"
            title="Subcategories"
            value={category}
            onChange={setCategory}
            placeholder="Select subcategory…"
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
          <label htmlFor={`met_with_${entry.id}`}>Met with</label>
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
            amount,
            category,
            transactionCategory,
            financialAccountId,
            paymentMethod,
            repairOrImprovement,
            receiptType,
            paidToVendorId,
            paidToTenantId,
            paidToProspectiveTenantId,
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
