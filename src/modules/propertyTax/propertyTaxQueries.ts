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
}

export interface PropertyTaxInstallment {
  id: string
  property_id: string
  tax_year: number
  installment_1_amount: string | null
  installment_1_paid_date: string | null
  installment_1_document: TaxInstallmentDocument | null
  installment_2_amount: string | null
  installment_2_paid_date: string | null
  installment_2_document: TaxInstallmentDocument | null
}

export interface PropertyTaxInstallmentInput {
  tax_year: number
  installment_1_amount: string | null
  installment_1_paid_date: string | null
  installment_1_document_id: string | null
  installment_2_amount: string | null
  installment_2_paid_date: string | null
  installment_2_document_id: string | null
}

// installment_1_document / installment_2_document are both FKs to the same
// documents table, so each embed must name its own constraint (Postgres'
// default FK-name convention: <table>_<column>_fkey) to disambiguate.
const INSTALLMENT_SELECT = `
  id, property_id, tax_year,
  installment_1_amount, installment_1_paid_date,
  installment_1_document:documents!property_tax_installments_installment_1_document_id_fkey(id, storage_path, file_size, uploaded_at),
  installment_2_amount, installment_2_paid_date,
  installment_2_document:documents!property_tax_installments_installment_2_document_id_fkey(id, storage_path, file_size, uploaded_at)
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
export async function uploadTaxInstallmentDocument(
  accountId: string,
  propertyId: string,
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
      uploaded_by: uploadedBy,
      storage_path: path,
      file_size: file.size,
    })
    .select('id, storage_path, file_size, uploaded_at')
    .single()

  if (insertError) {
    return { data: null, error: insertError }
  }

  return { data: data as TaxInstallmentDocument, error: null }
}
