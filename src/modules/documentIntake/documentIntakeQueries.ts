import { supabase } from '../../shared/supabaseClient'
import type { DocumentIntakeRepository, IntakeDetails, IntakeRecord } from './documentIntake'

export interface StoredIntake {
 id: string; account_id: string; request_id: string; digest: string; filename: string
 storage_path: string; file_size: number; details: IntakeDetails
 status: IntakeRecord['status']; revision: number; document_id: string | null; created_at: string
 documents?: { label: string | null; category: string; property_id: string | null; unit_id: string | null } | null
 property?: { address: string | null; name: string | null } | null
 vendor?: { name: string } | null
 unit?: { unit_label: string } | null
}
export function mapIntake(row: StoredIntake): IntakeRecord {
 const details = row.documents ? { ...row.details, title: row.documents.label ?? row.filename,
  propertyId: row.documents.property_id, unitId: row.documents.unit_id, category: row.documents.category } : row.details
 return { ...details, id: row.id, accountId: row.account_id, requestId: row.request_id,
  documentId: row.document_id, filename: row.filename, status: row.status, revision: row.revision, capturedAt: row.created_at,
  propertyLabel:row.property?.address??row.property?.name??undefined,vendorLabel:row.vendor?.name,unitLabel:row.unit?.unit_label }
}
export async function fileFingerprint(file: Blob) {
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))].map(n => n.toString(16).padStart(2,'0')).join('')
}
function scoped(row: StoredIntake, accountId: string) {
 if (!row || row.account_id !== accountId || !row.storage_path.startsWith(`${accountId}/capture-intake/`)) throw Error('Document account mismatch.')
 return row
}
async function verifyFile(row: StoredIntake, digest: string) {
 const { data, error } = await supabase.storage.from('documents').download(row.storage_path)
 if (error || !data) throw Error('Could not verify the stored file. Retry this capture.')
 if (data.size !== Number(row.file_size) || await fileFingerprint(data) !== digest) throw Error('The stored file does not match. Nothing was finalized.')
 return data
}
export async function reviewDocument(accountId: string, record: IntakeRecord, details: IntakeDetails, file: boolean) {
 const { data, error } = await supabase.rpc('review_document_intake', {
  p_account: accountId, p_intake: record.id, p_revision: record.revision, p_details: details, p_file: file,
 })
 if (error) throw Error(error.message)
 return mapIntake(scoped(data as StoredIntake, accountId))
}
export const documentIntakeRepository: DocumentIntakeRepository = {
 async capture(accountId, requestId, file, details) {
  const digest = await fileFingerprint(file)
  const reserved = await supabase.rpc('reserve_document_intake', { p_account: accountId, p_request: requestId,
   p_digest: digest, p_filename: file.name, p_mime: file.type, p_size: file.size, p_details: details })
  if (reserved.error) throw Error(reserved.error.message)
  const row = scoped(reserved.data as StoredIntake, accountId)
  if (row.status === 'uploading') {
   const uploaded = await supabase.storage.from('documents').upload(row.storage_path, file, { upsert: false, contentType: file.type })
   if (uploaded.error) {
    const status = String((uploaded.error as { statusCode?: string }).statusCode)
    if (status !== '409' && !/already exists|duplicate/i.test(uploaded.error.message)) throw Error(uploaded.error.message)
   }
  }
  await verifyFile(row, digest)
  const finished = await supabase.rpc('finish_document_intake', { p_account: accountId, p_intake: row.id })
  if (finished.error) throw Error(finished.error.message)
  return mapIntake(scoped(finished.data as StoredIntake, accountId))
 },
 async list(accountId) {
  const rows: IntakeRecord[] = []
  for (let offset = 0; ; offset += 100) {
   const { data, error } = await supabase.from('document_intakes')
    .select('*, documents!document_id(label, category, property_id, unit_id), property:properties!property_id(address,name), vendor:vendors!vendor_id(name), unit:units!unit_id(unit_label)')
    .eq('account_id', accountId).order('id').range(offset, offset + 99)
   if (error) throw Error(error.message)
   for (const row of data as StoredIntake[]) rows.push(mapIntake(scoped(row, accountId)))
   if (data.length < 100) return rows.sort((a,b) => (b.capturedAt ?? '').localeCompare(a.capturedAt ?? ''))
  }
 },
 async file(accountId, id, revision, destination) {
  const { data, error } = await supabase.from('document_intakes').select('*').eq('account_id', accountId).eq('id', id).single()
  if (error) throw Error(error.message)
  const row = scoped(data as StoredIntake, accountId)
  return reviewDocument(accountId, { ...mapIntake(row), revision }, { ...row.details, ...destination }, true)
 },
}
export async function openIntakeDocument(accountId: string, id: string) {
 const { data, error } = await supabase.from('document_intakes').select('*').eq('account_id',accountId).eq('id',id).single()
 if (error) throw Error(error.message)
 const row = scoped(data as StoredIntake, accountId)
 return verifyFile(row, row.digest)
}
