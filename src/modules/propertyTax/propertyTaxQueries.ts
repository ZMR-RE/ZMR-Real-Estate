import { supabase } from '../../shared/supabaseClient'

// Matches the 'document_type' pick-list value used by the 2.5 document
// architecture (see documents table check constraint) — tax bills land in
// the same category a manually-filed tax document would.
const TAX_DOCUMENT_CATEGORY = 'Tax Documents'

export interface TaxInstallmentDocument {
  id: string
  storage_path: string
  file_size: number
  uploaded_at: string
  tax_installment_number: 1 | 2
}

export interface PropertyTaxInstallment {
  id: string
  property_id: string
  tax_year: number
  installment_1_amount: string | null
  installment_1_paid_date: string | null
  installment_2_amount: string | null
  installment_2_paid_date: string | null
  documents: TaxInstallmentDocument[]
}

export interface PropertyTaxInstallmentInput {
  tax_year: number
  installment_1_amount: string | null
  installment_1_paid_date: string | null
  installment_2_amount: string | null
  installment_2_paid_date: string | null
}

// Roadmap 9.5 revision — a tax installment can now carry multiple
// documents per slot (e.g. the bill AND a payment confirmation), so
// documents is fetched as an array via the reverse FK
// (documents.property_tax_installment_id) rather than the old single
// installment_N_document_id column on this table. Splitting the array
// into "1st installment" vs "2nd installment" documents happens in the
// UI layer (by each document's own tax_installment_number), not here —
// simpler than fighting PostgREST into two separately-filtered embeds
// of the same relationship.
const INSTALLMENT_SELECT = `
  id, property_id, tax_year,
  installment_1_amount, installment_1_paid_date,
  installment_2_amount, installment_2_paid_date,
  documents:documents!documents_property_tax_installment_id_fkey(id, storage_path, file_size, uploaded_at, tax_installment_number)
`

export async function listTaxInstallments(accountId: string, propertyId: string) {
  return supabase
    .from('property_tax_installments')
    .select(INSTALLMENT_SELECT)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('tax_year', { ascending: false })
    .returns<PropertyTaxInstallment[]>()
}

export async function createTaxInstallment(
  accountId: string,
  propertyId: string,
  input: PropertyTaxInstallmentInput,
) {
  return supabase
    .from('property_tax_installments')
    .insert({ ...input, account_id: accountId, property_id: propertyId })
    .select(INSTALLMENT_SELECT)
    .single()
}

export async function updateTaxInstallment(id: string, input: PropertyTaxInstallmentInput) {
  return supabase.from('property_tax_installments').update(input).eq('id', id).select(INSTALLMENT_SELECT).single()
}

// Uploads a tax bill/receipt straight into the 2.5 document architecture
// (private "documents" bucket + documents table row), the same storage
// convention the Reconciliation move-to-Documents action uses. This module
// writes its own copy of that logic rather than extending documentsQueries.ts,
// which another terminal has uncommitted work in.
//
// Roadmap 9.5 revision — attaches directly to a specific installment +
// slot (1 or 2) at upload time via the new property_tax_installment_id/
// tax_installment_number columns, so multiple documents can accumulate
// against the same slot instead of the old single-FK-per-slot design.
// Requires a real installment id, so the installment row must already
// exist (created first, with no documents, if this is a brand-new one)
// before any document upload for it can happen.
export async function uploadTaxInstallmentDocument(
  accountId: string,
  propertyId: string,
  propertyTaxInstallmentId: string,
  installmentNumber: 1 | 2,
  uploadedBy: string,
  file: File,
) {
  const path = `${accountId}/${propertyId}/${TAX_DOCUMENT_CATEGORY}/${crypto.randomUUID()}-${file.name}`

  const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
  if (uploadError) {
    return { data: null, error: uploadError }
  }

  const { data, error: insertError } = await supabase
    .from('documents')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      category: TAX_DOCUMENT_CATEGORY,
      property_tax_installment_id: propertyTaxInstallmentId,
      tax_installment_number: installmentNumber,
      uploaded_by: uploadedBy,
      storage_path: path,
      file_size: file.size,
    })
    .select('id, storage_path, file_size, uploaded_at, tax_installment_number')
    .single()

  if (insertError) {
    return { data: null, error: insertError }
  }

  return { data: data as TaxInstallmentDocument, error: null }
}
