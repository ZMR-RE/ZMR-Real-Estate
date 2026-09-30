import { supabase } from '../../shared/supabaseClient'
import type { RentInvoiceRow } from './rentInvoiceTypes'

// Every Supabase call for Stage 1 invoicing. Writes go ONLY through the
// database actions (direct table writes are refused by invoices_guard), so
// the owner's Rent ops path and the assistant path follow identical rules.

const INVOICE_COLUMNS =
  'id, account_id, property_id, lease_id, billing_entity_id, state, number, revision, revision_of, version, material_version, approved_material_version, period_start, period_end, amount_due, due_date, recipient_name, recipient_email, visible_note, internal_note, issuer_snapshot, recipient_snapshot, issued_at, created_via, invoice_lines(id, line_kind, description, amount, sort_order)'

export interface InvoiceLineInput {
  line_kind: 'rent' | 'prorated_rent' | 'charge' | 'credit'
  description: string
  amount: number
}

export interface InvoicePatch {
  due_date?: string
  billing_entity_id?: string | null
  recipient_name?: string | null
  recipient_email?: string | null
  visible_note?: string | null
  internal_note?: string | null
  lines?: InvoiceLineInput[]
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
  return supabase.rpc('create_invoice_draft', { p_lease_id: leaseId, p_period_start: periodStart, p_created_via: 'owner', p_manual_amount: manualAmount })
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
  mailing_address: string | null
  mailing_city: string | null
  mailing_state: string | null
  mailing_zip: string | null
  billing_reply_to_email: string | null
  payment_instructions: string | null
}

export async function listIssuers(accountId: string) {
  return supabase
    .from('llcs')
    .select('id, name, display_name, invoice_code, mailing_address, mailing_city, mailing_state, mailing_zip, billing_reply_to_email, payment_instructions')
    .eq('account_id', accountId)
    .eq('archived', false)
    .order('name')
    .returns<IssuerRow[]>()
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
export async function attachIssuedInvoicePdf(inv: RentInvoiceRow, filename: string, pdf: Blob) {
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
