import { supabase } from '../../shared/supabaseClient'

export type EntryType = 'receipt' | 'visit' | 'communication' | 'mileage'
export type AttachmentType = 'photo' | 'pdf'

export const MAX_ATTACHMENTS_PER_ENTRY = 25

export interface CaptureAttachment {
  id: string
  storage_path: string
  attachment_type: AttachmentType
}

export interface CaptureEntry {
  id: string
  entry_type: EntryType
  entry_date: string
  notes: string | null
  miles_driven: string | null
  start_destination: string | null
  end_destination: string | null
  unit_id: string | null
  unit: { id: string; unit_label: string } | null
  amount: string | null
  category: string | null
  financial_account_id: string | null
  financial_account: { id: string; nickname: string; last_four: string; account_type: string } | null
  payment_method: string | null
  repair_or_improvement: string | null
  entry_direction: string | null
  paid_to_vendor_id: string | null
  paid_to_vendor: { id: string; name: string } | null
  paid_to_tenant_id: string | null
  paid_to_tenant: { id: string; name: string } | null
  paid_to_prospective_tenant_id: string | null
  paid_to_prospective_tenant: { id: string; name: string } | null
  met_with: string | null
  met_with_vendor_id: string | null
  met_with_vendor: { id: string; name: string } | null
  met_with_tenant_id: string | null
  met_with_tenant: { id: string; name: string } | null
  met_with_prospective_tenant_id: string | null
  met_with_prospective_tenant: { id: string; name: string } | null
  visit_type: string | null
  contact_name: string | null
  contact_method: string | null
  subject: string | null
  reconciled: boolean
  reconciled_at: string | null
  manually_completed: boolean
  property: { id: string; name: string; address: string | null }
  attachments: CaptureAttachment[]
}

// Multiple FKs from capture_log to vendors/tenants/prospective_tenants
// now exist (vendor-side: met_with_vendor_id + 1.31's paid_to_vendor_id;
// tenant-side: met_with_tenant_id + paid_to_tenant_id; prospective-
// tenant-side: met_with_prospective_tenant_id +
// paid_to_prospective_tenant_id) — PostgREST needs every one of these
// embeds' specific constraint name to disambiguate which FK it's
// following, or all of them error. Postgres auto-names an unnamed
// `references` constraint `<table>_<column>_fkey`; all were added that
// way. The old vendor_id column (1.17) is deliberately NOT selected
// here anymore — 20260921200000 backfilled it into paid_to_vendor_id
// and the UI never writes it again (kept in the DB, unused, per
// CLAUDE.md's no-drop-without-approval rule).
const CAPTURE_ENTRY_COLUMNS =
  'id, entry_type, entry_date, notes, miles_driven, start_destination, end_destination, unit_id, unit:units(id, unit_label), amount, category, financial_account_id, financial_account:property_financial_accounts(id, nickname, last_four, account_type), payment_method, repair_or_improvement, entry_direction, paid_to_vendor_id, paid_to_vendor:vendors!capture_log_paid_to_vendor_id_fkey(id, name), paid_to_tenant_id, paid_to_tenant:tenants!capture_log_paid_to_tenant_id_fkey(id, name), paid_to_prospective_tenant_id, paid_to_prospective_tenant:prospective_tenants!capture_log_paid_to_prospective_tenant_id_fkey(id, name), met_with, met_with_vendor_id, met_with_vendor:vendors!capture_log_met_with_vendor_id_fkey(id, name), met_with_tenant_id, met_with_tenant:tenants!capture_log_met_with_tenant_id_fkey(id, name), met_with_prospective_tenant_id, met_with_prospective_tenant:prospective_tenants!capture_log_met_with_prospective_tenant_id_fkey(id, name), visit_type, contact_name, contact_method, subject, reconciled, reconciled_at, manually_completed, property:properties(id, name, address), attachments:capture_attachments(id, storage_path, attachment_type)'

// Root-cause fix for a real bug found while building 1.21: PostgREST
// doesn't reliably return every numeric(...) column as a JSON string —
// miles_driven/amount can come back as genuine JS numbers depending on
// context. Every other consumer only ever sees these fields via a text
// input's onChange (always a string), so this never surfaced until
// something (mileage's trip auto-fill) set state directly from fetched
// data. CaptureEntryDetailsForm does the same (`useState(entry.amount ??
// '')`), so "open Add details, don't touch Amount, Save" was silently
// broken too — .trim() throws on a number, the whole save silently no-
// ops. Normalizing right here, once, is cheaper and safer than auditing
// every consumer for defensive String() calls.
function normalizeCaptureEntry(entry: CaptureEntry): CaptureEntry {
  return {
    ...entry,
    miles_driven: entry.miles_driven === null ? null : String(entry.miles_driven),
    amount: entry.amount === null ? null : String(entry.amount),
  }
}

export async function uploadAttachment(accountId: string, file: File) {
  const path = `${accountId}/${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('capture-attachments').upload(path, file)
  return { path, error }
}

export interface CreateCaptureEntryInput {
  accountId: string
  propertyId: string
  capturedBy: string
  entryType: EntryType
  entryDate: string
  notes: string | null
  milesDriven: number | null
  startDestination: string | null
  endDestination: string | null
  unitId: string | null
  amount: number | null
  category: string | null
  financialAccountId: string | null
  paymentMethod: string | null
  repairOrImprovement: string | null
  entryDirection: string | null
  paidToVendorId: string | null
  paidToTenantId: string | null
  paidToProspectiveTenantId: string | null
  metWith: string | null
  metWithVendorId: string | null
  metWithTenantId: string | null
  metWithProspectiveTenantId: string | null
  visitType: string | null
  contactName: string | null
  contactMethod: string | null
  subject: string | null
}

// Roadmap 1.7 — only type/property/date gate the save itself; every
// other field (notes, miles driven, attachments, and each type's own
// fields added by the 1.7 correction — vendor/amount/category for
// Receipt, met_with for Visit, contact_name/contact_method/subject for
// Communication) is filled in here if available, but none of it blocks
// creating the row. Attachments are inserted separately
// (addCaptureAttachments) once this row's id exists.
export async function createCaptureEntry(input: CreateCaptureEntryInput) {
  const result = await supabase
    .from('capture_log')
    .insert({
      account_id: input.accountId,
      property_id: input.propertyId,
      captured_by: input.capturedBy,
      entry_type: input.entryType,
      entry_date: input.entryDate,
      notes: input.notes,
      miles_driven: input.milesDriven,
      start_destination: input.startDestination,
      end_destination: input.endDestination,
      unit_id: input.unitId,
      amount: input.amount,
      category: input.category,
      financial_account_id: input.financialAccountId,
      payment_method: input.paymentMethod,
      repair_or_improvement: input.repairOrImprovement,
      entry_direction: input.entryDirection,
      paid_to_vendor_id: input.paidToVendorId,
      paid_to_tenant_id: input.paidToTenantId,
      paid_to_prospective_tenant_id: input.paidToProspectiveTenantId,
      met_with: input.metWith,
      met_with_vendor_id: input.metWithVendorId,
      met_with_tenant_id: input.metWithTenantId,
      met_with_prospective_tenant_id: input.metWithProspectiveTenantId,
      visit_type: input.visitType,
      contact_name: input.contactName,
      contact_method: input.contactMethod,
      subject: input.subject,
    })
    .select(CAPTURE_ENTRY_COLUMNS)
    .single<CaptureEntry>()
  if (result.data) result.data = normalizeCaptureEntry(result.data)
  return result
}

export interface UploadedAttachment {
  path: string
  type: AttachmentType
}

// Roadmap 1.8 — up to MAX_ATTACHMENTS_PER_ENTRY per entry. The cap is
// enforced by callers (they know the entry's current attachment count);
// this just inserts whatever it's given.
export async function addCaptureAttachments(
  accountId: string,
  captureLogId: string,
  attachments: UploadedAttachment[],
) {
  if (attachments.length === 0) return { error: null }
  return supabase.from('capture_attachments').insert(
    attachments.map((a) => ({
      account_id: accountId,
      capture_log_id: captureLogId,
      storage_path: a.path,
      attachment_type: a.type,
    })),
  )
}

// Called once a capture_attachments row's underlying file has been moved
// into the permanent Documents path (roadmap 2.6's reconcile flow) — the
// row would otherwise keep pointing at a capture-attachments path the
// file no longer lives at, which "Recently logged" (roadmap 1.10, unlike
// the old reconciled:false-only Reconciliation Queue) can actually
// render for an already-reconciled entry.
export async function deleteCaptureAttachment(id: string) {
  return supabase.from('capture_attachments').delete().eq('id', id)
}

export interface CaptureEntryFilters {
  propertyId?: string | null
  reconciled?: boolean
  limit?: number
}

// Roadmap 1.10 — the one shared read path for capture_log. Quick
// Capture's "Recently logged" and the Reconciliation Queue both call
// this (with different filters) instead of each hand-rolling its own
// select against the same table, so there is exactly one place that
// decides what a capture entry looks like.
export async function listCaptureEntries(accountId: string, filters: CaptureEntryFilters = {}) {
  let query = supabase
    .from('capture_log')
    .select(CAPTURE_ENTRY_COLUMNS)
    .eq('account_id', accountId)
    .eq('voided', false)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.propertyId) {
    query = query.eq('property_id', filters.propertyId)
  }
  if (filters.reconciled !== undefined) {
    query = query.eq('reconciled', filters.reconciled)
  }
  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const result = await query.returns<CaptureEntry[]>()
  if (result.data) result.data = result.data.map(normalizeCaptureEntry)
  return result
}

export interface UpdateCaptureEntryDetailsInput {
  notes: string | null
  milesDriven: number | null
  startDestination: string | null
  endDestination: string | null
  unitId: string | null
  amount: number | null
  category: string | null
  financialAccountId: string | null
  paymentMethod: string | null
  repairOrImprovement: string | null
  entryDirection: string | null
  paidToVendorId: string | null
  paidToTenantId: string | null
  paidToProspectiveTenantId: string | null
  metWith: string | null
  metWithVendorId: string | null
  metWithTenantId: string | null
  metWithProspectiveTenantId: string | null
  visitType: string | null
  contactName: string | null
  contactMethod: string | null
  subject: string | null
}

// Roadmap 1.11 — "any remaining-field completion happens in Recently
// logged/Reconciliation": this is that edit path. Never called from the
// Quick Capture create form itself.
export async function updateCaptureEntryDetails(id: string, input: UpdateCaptureEntryDetailsInput) {
  const result = await supabase
    .from('capture_log')
    .update({
      notes: input.notes,
      miles_driven: input.milesDriven,
      start_destination: input.startDestination,
      end_destination: input.endDestination,
      unit_id: input.unitId,
      amount: input.amount,
      category: input.category,
      financial_account_id: input.financialAccountId,
      payment_method: input.paymentMethod,
      repair_or_improvement: input.repairOrImprovement,
      entry_direction: input.entryDirection,
      paid_to_vendor_id: input.paidToVendorId,
      paid_to_tenant_id: input.paidToTenantId,
      paid_to_prospective_tenant_id: input.paidToProspectiveTenantId,
      met_with: input.metWith,
      met_with_vendor_id: input.metWithVendorId,
      met_with_tenant_id: input.metWithTenantId,
      met_with_prospective_tenant_id: input.metWithProspectiveTenantId,
      visit_type: input.visitType,
      contact_name: input.contactName,
      contact_method: input.contactMethod,
      subject: input.subject,
    })
    .eq('id', id)
    .select(CAPTURE_ENTRY_COLUMNS)
    .single<CaptureEntry>()
  if (result.data) result.data = normalizeCaptureEntry(result.data)
  return result
}

// Roadmap 1.11's manual override — forces Complete regardless of the
// computed field-completeness check (captureCalculations.ts). Only ever
// set from Recently logged/Reconciliation, never from Quick Capture.
export async function setManuallyCompleted(id: string, value: boolean) {
  const result = await supabase
    .from('capture_log')
    .update({ manually_completed: value })
    .eq('id', id)
    .select(CAPTURE_ENTRY_COLUMNS)
    .single<CaptureEntry>()
  if (result.data) result.data = normalizeCaptureEntry(result.data)
  return result
}

export async function markReconciled(id: string) {
  const result = await supabase
    .from('capture_log')
    .update({ reconciled: true, reconciled_at: new Date().toISOString() })
    .eq('id', id)
    .select(CAPTURE_ENTRY_COLUMNS)
    .single<CaptureEntry>()
  if (result.data) result.data = normalizeCaptureEntry(result.data)
  return result
}

// Roadmap 1.9 — the only "removal" path for a capture entry, and only
// while it's still staged (not yet reconciled) — never a hard DELETE,
// matching the voided/voided_at pattern used everywhere else in this
// schema. Callers are responsible for only offering this while
// !entry.reconciled; nothing here re-checks that server-side beyond RLS.
export async function voidCaptureEntry(id: string) {
  return supabase
    .from('capture_log')
    .update({ voided: true, voided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

export async function getAttachmentSignedUrl(path: string) {
  return supabase.storage.from('capture-attachments').createSignedUrl(path, 60)
}

// Property Profile's Activity Log tab (roadmap 7.1) — visit/communication
// entries only; receipts belong to Transactions, mileage has no property-
// profile surface of its own.
export interface ActivityLogEntry {
  id: string
  entry_type: EntryType
  entry_date: string
  notes: string | null
  attachments: CaptureAttachment[]
}

export async function listActivityLog(accountId: string, propertyId: string) {
  return supabase
    .from('capture_log')
    .select('id, entry_type, entry_date, notes, attachments:capture_attachments(id, storage_path, attachment_type)')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .eq('voided', false)
    .in('entry_type', ['visit', 'communication'])
    .order('entry_date', { ascending: false })
    .returns<ActivityLogEntry[]>()
}
