import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { hasAtMostTwoDecimalPlaces } from '../../shared/currencyInput'
import { listProperties } from '../properties/propertiesQueries'
import { listUnits } from '../units/unitsQueries'
import { listFinancialAccountsForEntry } from '../financialAccounts/financialAccountsQueries'
import { listAllTenantsForProperty, type PropertyTenantOption } from '../tenants/propertyTenantsQueries'
import {
  createProspectiveTenant,
  listProspectiveTenantsForProperty,
  type ProspectiveTenant,
  type ProspectiveTenantInput,
} from '../tenants/prospectiveTenantsQueries'
import { useVendors } from '../vendors/useVendors'
import { listMileageTrips, upsertMileageTrip, type MileageTrip } from './mileageTripsQueries'
import {
  addCaptureAttachments,
  createCaptureEntry,
  uploadAttachment,
  MAX_ATTACHMENTS_PER_ENTRY,
  type AttachmentType,
  type EntryType,
} from './captureQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function attachmentTypeFor(file: File): AttachmentType | null {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type === 'application/pdf') return 'pdf'
  return null
}

// Roadmap 1.6 — capture-type selection is mandatory before any other
// field appears; CaptureForm.tsx enforces the "before" part (it doesn't
// render property/date/etc. until entryType is set), this hook just
// never defaults entryType away from null.
export function useCaptureForm(onCaptured?: () => void) {
  const { accountId, session } = useAuth()
  const { vendorOptions, addVendor, refreshVendorOptions } = useVendors(accountId)
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  // Roadmap 7.40 — propertyId -> llc_id, so the Financial account picker
  // knows whether the selected property belongs to an LLC (and can pull
  // in that LLC's shared accounts) without widening propertyOptions'
  // own {id, label} shape, which SearchableSelect elsewhere assumes.
  const [propertyLlcIds, setPropertyLlcIds] = useState<Record<string, string | null>>({})
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [entryType, setEntryType] = useState<EntryType | null>(null)
  const [propertyId, setPropertyIdState] = useState<string | null>(null)
  const [unitOptions, setUnitOptions] = useState<{ id: string; label: string }[]>([])
  const [unitId, setUnitId] = useState<string | null>(null)
  const [entryDate, setEntryDate] = useState(todayDateString())
  const [notes, setNotes] = useState('')
  const [milesDriven, setMilesDriven] = useState('')
  const [startDestination, setStartDestination] = useState('')
  const [endDestination, setEndDestination] = useState('')
  const [tripOptions, setTripOptions] = useState<MileageTrip[]>([])
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  // Roadmap 9.9 — the top-level Schedule-E category the bridge needs;
  // `category` above is actually the subcategory (see its own field
  // comment in captureQueries.ts). Not required to save the capture
  // entry itself (roadmap 1.7), only to reconcile it.
  const [transactionCategory, setTransactionCategory] = useState('')
  const [financialAccountOptions, setFinancialAccountOptions] = useState<{ id: string; label: string }[]>([])
  const [financialAccountId, setFinancialAccountIdState] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [repairOrImprovement, setRepairOrImprovement] = useState('')
  // Roadmap 1.31 — "Receipt type" (renamed from "Entry direction" by
  // 20260922000000, widened to 3 values: Expense/Income/Refund-Return).
  // Groundwork for 1.33, scoped narrowly — the label switch only, no
  // Category-filtering behavior. Refund-Return has no live P&L effect
  // today (confirmed with the user): reconciling a capture entry only
  // flags it reconciled, it never creates a financial_transactions row
  // (that bridge is roadmap 9.9, unbuilt), so there's nothing yet for a
  // "reduction to the expense category" to apply to. Defaults to
  // 'expense' since virtually all Receipt usage today is an expense and
  // the label needs a determinate value to render. Only meaningful for
  // entryType === 'receipt'.
  const [receiptType, setReceiptType] = useState('expense')
  const [tenantOptions, setTenantOptions] = useState<PropertyTenantOption[]>([])
  const [prospectiveTenantOptions, setProspectiveTenantOptions] = useState<ProspectiveTenant[]>([])
  // Roadmap 1.31 — Receipt's "Vendor" field becomes the same
  // Vendors/Tenants/Potential-tenants picker Visit's "who was met with"
  // (1.28) already uses, so a receipt can be paid to (or received from)
  // a tenant or potential tenant too. Exact mirror of metWith* below,
  // just its own independent state since the two are semantically
  // distinct relationships that could both exist on the schema (even
  // though only one is ever populated per row, gated by entryType).
  const [paidToVendorId, setPaidToVendorId] = useState<string | null>(null)
  const [paidToTenantId, setPaidToTenantId] = useState<string | null>(null)
  const [paidToProspectiveTenantId, setPaidToProspectiveTenantId] = useState<string | null>(null)
  const [metWithVendorId, setMetWithVendorId] = useState<string | null>(null)
  const [metWithTenantId, setMetWithTenantId] = useState<string | null>(null)
  const [metWithProspectiveTenantId, setMetWithProspectiveTenantId] = useState<string | null>(null)
  const [visitType, setVisitType] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactMethod, setContactMethod] = useState('')
  const [subject, setSubject] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!accountId) return
    setPropertiesLoading(true)
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: propertyLabel(p) })))
      setPropertyLlcIds(Object.fromEntries((data ?? []).map((p) => [p.id, p.llc_id])))
      setPropertiesLoading(false)
    })
  }, [accountId])

  // Roadmap 1.16 — Unit only makes sense scoped to whichever property is
  // currently selected, so it's re-fetched every time propertyId changes
  // rather than loaded once up front like propertyOptions.
  useEffect(() => {
    if (!accountId || !propertyId) {
      setUnitOptions([])
      return
    }
    listUnits(accountId, propertyId).then(({ data }) => {
      setUnitOptions((data ?? []).map((u) => ({ id: u.id, label: u.unit_label })))
    })
  }, [accountId, propertyId])

  // Roadmap 1.21 — reusable trips, scoped to whichever property is
  // selected (same reasoning/pattern as Unit above).
  useEffect(() => {
    if (!accountId || !propertyId) {
      setTripOptions([])
      return
    }
    listMileageTrips(accountId, propertyId).then(({ data }) => {
      setTripOptions(data ?? [])
    })
  }, [accountId, propertyId])

  // Roadmap 1.16 correction — Financial account, scoped to whichever
  // property is selected, same pattern as Unit. Roadmap 7.40 — widened
  // to also include that property's LLC's shared accounts (if any),
  // grouped separately in the picker.
  const refreshFinancialAccountOptions = () => {
    if (!accountId || !propertyId) return
    const llcId = propertyLlcIds[propertyId] ?? null
    listFinancialAccountsForEntry(accountId, propertyId, llcId).then(({ data }) => {
      setFinancialAccountOptions(
        (data ?? [])
          .filter((a) => !a.archived)
          .map((a) => ({
            id: a.id,
            label: `${a.nickname} ...${a.last_four}`,
            group: a.llc_id ? 'Shared accounts' : 'This property',
          })),
      )
    })
  }

  useEffect(() => {
    if (!accountId || !propertyId) {
      setFinancialAccountOptions([])
      return
    }
    refreshFinancialAccountOptions()
  }, [accountId, propertyId, propertyLlcIds])

  // Roadmap 1.28 — tenant options are property-scoped, same reasoning as
  // Unit/Financial account above.
  useEffect(() => {
    if (!accountId || !propertyId) {
      setTenantOptions([])
      return
    }
    listAllTenantsForProperty(accountId, propertyId).then(({ data }) => {
      setTenantOptions(data ?? [])
    })
  }, [accountId, propertyId])

  // Roadmap 1.28 revision — potential tenants, same property scoping as
  // Tenant above.
  useEffect(() => {
    if (!accountId || !propertyId) {
      setProspectiveTenantOptions([])
      return
    }
    listProspectiveTenantsForProperty(accountId, propertyId).then(({ data }) => {
      setProspectiveTenantOptions(data ?? [])
    })
  }, [accountId, propertyId])

  // A unit selected under the previous property is never valid once the
  // property itself changes — every propertyId change starts Unit over.
  // A previously-picked tenant/potential tenant is subject to the same
  // rule (Financial account already was); Vendor stays valid across
  // properties since it's account-wide, not property-scoped.
  const setPropertyId = (id: string | null) => {
    setPropertyIdState(id)
    setUnitId(null)
    setFinancialAccountIdState(null)
    setPaymentMethod('')
    setPaidToTenantId(null)
    setPaidToProspectiveTenantId(null)
    setMetWithTenantId(null)
    setMetWithProspectiveTenantId(null)
  }

  // Roadmap 1.28 revision — no freeform fallback: "who was met with" is
  // always a real Vendor, Tenant, or Potential tenant record. The
  // picker's single `value` is whichever entity (if any) is currently
  // selected; selecting one clears the other two so only one is ever
  // active at a time. A person not yet on file is added as a real record
  // on the spot — a Vendor or a Potential tenant, via the picker's own
  // "+ Add new vendor" / "+ Add potential tenant" — never as loose text.
  const metWithEntityId = metWithVendorId ?? metWithTenantId ?? metWithProspectiveTenantId ?? null
  const metWithOptions = [
    ...vendorOptions.map((v) => ({ ...v, group: 'Vendors' })),
    ...tenantOptions.map((t) => ({ id: t.id, label: t.name, group: 'Tenants' })),
    ...prospectiveTenantOptions.map((t) => ({ id: t.id, label: t.name, group: 'Potential tenants' })),
  ]
  const selectMetWithEntity = (id: string) => {
    if (vendorOptions.some((v) => v.id === id)) {
      setMetWithVendorId(id)
      setMetWithTenantId(null)
      setMetWithProspectiveTenantId(null)
    } else if (tenantOptions.some((t) => t.id === id)) {
      setMetWithTenantId(id)
      setMetWithVendorId(null)
      setMetWithProspectiveTenantId(null)
    } else {
      setMetWithProspectiveTenantId(id)
      setMetWithVendorId(null)
      setMetWithTenantId(null)
    }
  }
  // Called once a vendor/potential tenant is created inline from this
  // picker's own "+ Add new vendor" / "+ Add potential tenant" — the
  // newly created id isn't in vendorOptions/prospectiveTenantOptions yet
  // this render (those lists only update once their own state settles),
  // so selectMetWithEntity's lookup can't be trusted here; the caller
  // already knows for certain which kind it is.
  const selectNewMetWithVendor = (id: string) => {
    setMetWithVendorId(id)
    setMetWithTenantId(null)
    setMetWithProspectiveTenantId(null)
  }
  const selectNewMetWithProspectiveTenant = (id: string) => {
    setMetWithProspectiveTenantId(id)
    setMetWithVendorId(null)
    setMetWithTenantId(null)
  }

  // Roadmap 1.31 — Receipt's "Paid to"/"Received from" picker, exact
  // mirror of "who was met with" above (same three-way entity list, same
  // mutual-exclusivity rule), just writing to paidTo* instead of
  // metWith*.
  const paidToEntityId = paidToVendorId ?? paidToTenantId ?? paidToProspectiveTenantId ?? null
  const paidToOptions = [
    ...vendorOptions.map((v) => ({ ...v, group: 'Vendors' })),
    ...tenantOptions.map((t) => ({ id: t.id, label: t.name, group: 'Tenants' })),
    ...prospectiveTenantOptions.map((t) => ({ id: t.id, label: t.name, group: 'Potential tenants' })),
  ]
  // Cross-module data freshness (CLAUDE.md) — same gap Financial account
  // had (roadmap 1.16 correction) before its onOpen refresh: this
  // picker's three sources (vendors is account-wide, tenants/potential
  // tenants are property-scoped) only ever re-fetch on mount or when
  // propertyId changes, so a vendor/tenant/potential tenant added
  // elsewhere while this form stays mounted wouldn't show up without a
  // reload. Called from the "Paid to"/"Received from" picker's onOpen.
  const refreshPaidToOptions = () => {
    refreshVendorOptions()
    if (!accountId || !propertyId) return
    listAllTenantsForProperty(accountId, propertyId).then(({ data }) => {
      setTenantOptions(data ?? [])
    })
    listProspectiveTenantsForProperty(accountId, propertyId).then(({ data }) => {
      setProspectiveTenantOptions(data ?? [])
    })
  }
  const selectPaidToEntity = (id: string) => {
    if (vendorOptions.some((v) => v.id === id)) {
      setPaidToVendorId(id)
      setPaidToTenantId(null)
      setPaidToProspectiveTenantId(null)
    } else if (tenantOptions.some((t) => t.id === id)) {
      setPaidToTenantId(id)
      setPaidToVendorId(null)
      setPaidToProspectiveTenantId(null)
    } else {
      setPaidToProspectiveTenantId(id)
      setPaidToVendorId(null)
      setPaidToTenantId(null)
    }
  }
  const selectNewPaidToVendor = (id: string) => {
    setPaidToVendorId(id)
    setPaidToTenantId(null)
    setPaidToProspectiveTenantId(null)
  }
  const selectNewPaidToProspectiveTenant = (id: string) => {
    setPaidToProspectiveTenantId(id)
    setPaidToVendorId(null)
    setPaidToTenantId(null)
  }

  // Exposed for the picker's own "+ Add potential tenant" inline
  // creation — mirrors useVendors' addVendor shape ({id} | {error}) so
  // CaptureForm.tsx's handler can treat both the same way.
  const onCreateProspectiveTenant = async (
    input: ProspectiveTenantInput,
  ): Promise<{ id: string } | { error: string }> => {
    if (!accountId || !propertyId) return { error: 'Select a property first.' }
    const { data, error: saveError } = await createProspectiveTenant(accountId, propertyId, input)
    if (saveError || !data) return { error: saveError?.message ?? 'Could not add potential tenant.' }
    setProspectiveTenantOptions((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { id: data.id }
  }

  // The "how" selector only means anything alongside a chosen account —
  // switching (or clearing) the account starts it over too.
  const setFinancialAccountId = (id: string | null) => {
    setFinancialAccountIdState(id)
    setPaymentMethod('')
  }

  // Selecting a previously-used trip auto-fills its recorded mileage
  // (and the start/end pair that identifies it) — the user can still
  // edit miles afterward if this particular trip varied slightly.
  const selectTrip = (trip: MileageTrip) => {
    setStartDestination(trip.start_destination)
    setEndDestination(trip.end_destination)
    setMilesDriven(trip.miles)
  }

  const reset = () => {
    setEntryType(null)
    setPropertyId(null)
    setEntryDate(todayDateString())
    setNotes('')
    setMilesDriven('')
    setStartDestination('')
    setEndDestination('')
    setAmount('')
    setCategory('')
    setTransactionCategory('')
    setFinancialAccountIdState(null)
    setPaymentMethod('')
    setRepairOrImprovement('')
    setReceiptType('expense')
    setPaidToVendorId(null)
    setPaidToTenantId(null)
    setPaidToProspectiveTenantId(null)
    setMetWithVendorId(null)
    setMetWithTenantId(null)
    setMetWithProspectiveTenantId(null)
    setVisitType('')
    setContactName('')
    setContactMethod('')
    setSubject('')
    setFiles([])
  }

  // Roadmap 1.8 — up to 25 attachments; adds to whatever's already
  // staged rather than replacing it, since <input type="file" multiple>
  // firing again (e.g. a second photo) would otherwise clobber the
  // first batch.
  const addFiles = (newFiles: File[]) => {
    setFiles((prev) => {
      const room = MAX_ATTACHMENTS_PER_ENTRY - prev.length
      if (room <= 0) {
        setError(`Up to ${MAX_ATTACHMENTS_PER_ENTRY} attachments per entry.`)
        return prev
      }
      return [...prev, ...newFiles.slice(0, room)]
    })
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = async () => {
    if (!accountId || !session) return

    // Roadmap 1.7 — only type, property, and date are required to save.
    if (!entryType || !propertyId) {
      setError('Type and property are required.')
      return
    }

    const invalidFile = files.find((f) => !attachmentTypeFor(f))
    if (invalidFile) {
      setError('Attachments must be photos or PDFs.')
      return
    }

    const parsedMiles = milesDriven.trim() ? Number(milesDriven) : null
    if (milesDriven.trim() && (Number.isNaN(parsedMiles) || (parsedMiles as number) < 0)) {
      setError('Miles driven must be a positive number.')
      return
    }

    const parsedAmount = amount.trim() ? Number(amount) : null
    if (amount.trim() && (Number.isNaN(parsedAmount) || (parsedAmount as number) <= 0)) {
      setError('Amount must be a positive number.')
      return
    }
    if (amount.trim() && !hasAtMostTwoDecimalPlaces(amount)) {
      setError('Amount can have at most 2 decimal places.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data: entry, error: insertError } = await createCaptureEntry({
      accountId,
      propertyId,
      capturedBy: session.user.id,
      entryType,
      entryDate,
      notes: notes.trim() || null,
      milesDriven: parsedMiles,
      startDestination: startDestination.trim() || null,
      endDestination: endDestination.trim() || null,
      unitId,
      amount: parsedAmount,
      category: category || null,
      transactionCategory: transactionCategory || null,
      financialAccountId,
      paymentMethod: paymentMethod || null,
      repairOrImprovement: repairOrImprovement || null,
      receiptType: entryType === 'receipt' ? receiptType : null,
      paidToVendorId,
      paidToTenantId,
      paidToProspectiveTenantId,
      metWith: null,
      metWithVendorId,
      metWithTenantId,
      metWithProspectiveTenantId,
      visitType: visitType || null,
      contactName: contactName.trim() || null,
      contactMethod: contactMethod || null,
      subject: subject.trim() || null,
    })

    if (insertError || !entry) {
      setSubmitting(false)
      setError(insertError?.message ?? 'Could not save entry.')
      return
    }

    // Roadmap 1.21 — a start/end pair alongside recorded miles becomes a
    // reusable trip; not a save-blocking step (miles + description alone
    // still counts as a complete, valid entry per this item's own rule),
    // so a failure here doesn't roll back or block the entry that was
    // already saved above.
    if (
      entryType === 'mileage' &&
      startDestination.trim() &&
      endDestination.trim() &&
      parsedMiles !== null &&
      parsedMiles > 0
    ) {
      await upsertMileageTrip(accountId, propertyId, startDestination.trim(), endDestination.trim(), parsedMiles)
    }

    if (files.length > 0) {
      const uploaded: { path: string; type: AttachmentType }[] = []
      for (const file of files) {
        const { path, error: uploadError } = await uploadAttachment(accountId, file)
        if (uploadError) {
          setSubmitting(false)
          setError(uploadError.message)
          return
        }
        uploaded.push({ path, type: attachmentTypeFor(file)! })
      }

      const { error: attachError } = await addCaptureAttachments(accountId, entry.id, uploaded)
      if (attachError) {
        setSubmitting(false)
        setError(attachError.message)
        return
      }
    }

    setSubmitting(false)
    reset()
    setSavedAt(Date.now())
    onCaptured?.()
  }

  return {
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
    vendorOptions,
    onCreateVendor: addVendor,
    amount,
    setAmount,
    category,
    setCategory,
    transactionCategory,
    setTransactionCategory,
    financialAccountId,
    setFinancialAccountId,
    financialAccountOptions,
    refreshFinancialAccountOptions,
    paymentMethod,
    setPaymentMethod,
    repairOrImprovement,
    setRepairOrImprovement,
    receiptType,
    setReceiptType,
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
  }
}
