import { supabase } from '../../shared/supabaseClient'
import type { StationeryLogo } from '../entityBranding/stationeryTypes'
import type { PrintSnapshot, RentInvoiceRow } from './rentInvoiceTypes'

// Every Supabase call for Stage 1 invoicing. Writes go ONLY through the
// database actions (direct table writes are refused by invoices_guard), so
// the owner's Rent ops path and the assistant path follow identical rules.

const INVOICE_COLUMNS =
  'id, account_id, property_id, lease_id, billing_entity_id, state, number, revision, revision_of, version, material_version, approved_material_version, period_start, period_end, amount_due, due_date, recipient_name, recipients, visible_note, internal_note, approved_snapshot, issued_snapshot, issued_at, created_via, invoice_lines(id, line_kind, description, amount, sort_order, rule_id, statement_id)'

export interface InvoiceLineInput {
  line_kind: 'rent' | 'prorated_rent' | 'charge' | 'credit'
  description: string
  amount: number
}

export interface InvoicePatch {
  due_date?: string
  billing_entity_id?: string | null
  visible_note?: string | null
  internal_note?: string | null
  // Manual lines only; billing-rule lines are kept by the database.
  lines?: InvoiceLineInput[]
  // Re-read the billed tenants' names/emails/phones from their profiles.
  refresh_recipients?: true
}

export async function listTenancyInvoices(leaseIds: string[]) {
  return supabase
    .from('invoices')
    .select(INVOICE_COLUMNS)
    .in('lease_id', leaseIds)
    .order('period_start', { ascending: false })
    .order('revision', { ascending: false })
    .returns<RentInvoiceRow[]>()
}

export async function listInvoicesAwaitingDecision(accountId: string) {
  return supabase
    .from('invoices')
    .select(INVOICE_COLUMNS)
    .eq('account_id', accountId)
    .in('state', ['draft', 'approved'])
    .order('period_start')
    .returns<RentInvoiceRow[]>()
}

export async function getDraftBlockers(leaseId: string, periodStart: string) {
  return supabase.rpc('get_invoice_draft_blockers', { p_lease_id: leaseId, p_period_start: periodStart })
}

export async function createInvoiceDraft(leaseId: string, periodStart: string, manualAmount: number | null = null) {
  // Always the owner's draft: provenance isn't a client choice (assistant
  // drafts come only from the assistant's run).
  return supabase.rpc('create_invoice_draft', { p_lease_id: leaseId, p_period_start: periodStart, p_manual_amount: manualAmount })
}

// What the invoice would print right now (issuer, branding, payment
// instructions and their source, recipients, lines, earlier unpaid).
export async function getPrintSnapshot(id: string) {
  const r = await supabase.rpc('invoice_print_snapshot', { p_id: id })
  return { data: (r.data ?? null) as PrintSnapshot | null, error: r.error }
}

export async function updateInvoiceDraft(id: string, expectedVersion: number, patch: InvoicePatch) {
  return supabase.rpc('update_invoice_draft', { p_id: id, p_expected_version: expectedVersion, p_patch: patch })
}

export async function approveInvoice(id: string, expectedVersion: number) {
  return supabase.rpc('approve_invoice', { p_id: id, p_expected_version: expectedVersion })
}

export async function rejectInvoice(id: string, expectedVersion: number, reason: string | null) {
  return supabase.rpc('reject_invoice', { p_id: id, p_expected_version: expectedVersion, p_reason: reason })
}

export async function issueInvoice(id: string, expectedVersion: number) {
  return supabase.rpc('issue_invoice', { p_id: id, p_expected_version: expectedVersion })
}

export async function reviseInvoice(id: string, expectedVersion: number) {
  return supabase.rpc('revise_invoice', { p_id: id, p_expected_version: expectedVersion })
}

export async function cancelInvoice(id: string, expectedVersion: number, reason: string) {
  return supabase.rpc('cancel_invoice', { p_id: id, p_expected_version: expectedVersion, p_reason: reason })
}

export async function setSequenceStart(entityId: string, docType: 'invoice' | 'receipt', nextValue: number) {
  return supabase.rpc('set_document_sequence_start', { p_entity_id: entityId, p_doc_type: docType, p_next_value: nextValue })
}

export interface TenancyOptionRow {
  id: string
  property_id: string
  start_date: string
  end_date: string | null
  unit: { unit_label: string } | null
  property: { address: string | null } | null
  lease_tenants: { is_billing_recipient: boolean; tenant: { id: string; name: string } | null }[]
}

export async function listTenancyOptions(accountId: string) {
  return supabase
    .from('leases')
    .select('id, property_id, start_date, end_date, unit:units(unit_label), property:properties(address), lease_tenants(is_billing_recipient, tenant:tenants(id, name))')
    .eq('account_id', accountId)
    .eq('archived', false)
    .returns<TenancyOptionRow[]>()
}

export interface IssuerRow {
  id: string
  name: string
  display_name: string | null
  invoice_code: string | null
}

export async function listIssuers(accountId: string) {
  return supabase.from('llcs').select('id, name, display_name, invoice_code').eq('account_id', accountId).eq('archived', false).order('name').returns<IssuerRow[]>()
}

export async function getInvoice(id: string) {
  return supabase.from('invoices').select(INVOICE_COLUMNS).eq('id', id).single().returns<RentInvoiceRow>()
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// Store an issued invoice's PDF once, linked to that invoice revision, with
// the bytes' SHA-256 recorded in the invoice's immutable history. The
// database refuses a PDF for a draft; Storage policies refuse later
// overwrite or deletion of the stored object.
export async function attachIssuedInvoicePdf(inv: Pick<RentInvoiceRow, 'id' | 'account_id' | 'property_id'>, filename: string, pdf: Blob) {
  const path = `${inv.account_id}/${inv.property_id}/Invoices/${filename}`
  const bytes = await pdf.arrayBuffer()
  const upload = await supabase.storage.from('documents').upload(path, pdf, { contentType: 'application/pdf', upsert: false })
  if (upload.error) return { error: upload.error }
  return supabase.rpc('attach_invoice_pdf', { p_invoice_id: inv.id, p_storage_path: path, p_file_size: bytes.byteLength, p_sha256: await sha256Hex(bytes) })
}

export interface StoredInvoicePdf {
  storage_path: string
  sha256: string | null
}

export async function getStoredInvoicePdf(invoiceId: string) {
  return supabase
    .from('invoice_events')
    .select('detail')
    .eq('invoice_id', invoiceId)
    .eq('event', 'pdf_attached')
    .maybeSingle()
    .returns<{ detail: { storage_path: string; sha256: string } } | null>()
}

// Opens the STORED bytes (not a re-render) and checks them against the
// digest recorded at attachment. Returns a short-lived URL to show.
export async function openStoredInvoicePdf(storagePath: string, expectedSha256: string | null) {
  const file = await supabase.storage.from('documents').download(storagePath)
  if (file.error || !file.data) return { error: file.error ?? new Error('The stored PDF could not be read.') }
  const matches = expectedSha256 ? (await sha256Hex(await file.data.arrayBuffer())) === expectedSha256 : null
  return { url: URL.createObjectURL(file.data), matches }
}

// The logo version an invoice snapshot names, as the renderer needs it.
// The file is checked against the digest recorded with the logo version.
export async function loadSnapshotLogo(logo: NonNullable<PrintSnapshot['branding']['logo']>): Promise<{ data: StationeryLogo | null; error: Error | null }> {
  const file = await supabase.storage.from('documents').download(logo.storage_path)
  if (file.error || !file.data) return { data: null, error: new Error('The entity logo couldn’t be loaded.') }
  const bytes = await file.data.arrayBuffer()
  if ((await sha256Hex(bytes)) !== logo.sha256) return { data: null, error: new Error('The stored logo doesn’t match the version recorded for this invoice.') }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file.data!)
  })
  return { data: { dataUrl, format: logo.format, width: logo.width, height: logo.height, name: logo.storage_path.split('/').pop() ?? 'logo' }, error: null }
}
