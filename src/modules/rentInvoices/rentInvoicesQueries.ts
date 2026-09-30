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

// Store an issued invoice's PDF once, linked to that invoice revision. The
// database refuses a PDF for a draft and refuses later changes/removal.
export async function attachIssuedInvoicePdf(inv: RentInvoiceRow, filename: string, pdf: Blob) {
  const path = `${inv.account_id}/${inv.property_id}/Invoices/${filename}`
  const upload = await supabase.storage.from('documents').upload(path, pdf, { contentType: 'application/pdf', upsert: false })
  if (upload.error) return { error: upload.error }
  return supabase.from('documents').insert({
    account_id: inv.account_id,
    property_id: inv.property_id,
    category: 'Invoices',
    storage_path: path,
    file_size: pdf.size,
    invoice_id: inv.id,
  })
}
