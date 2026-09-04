import { supabase } from '../../shared/supabaseClient'

export type EntryType = 'receipt' | 'visit' | 'communication'
export type AttachmentType = 'photo' | 'pdf'

export interface CaptureEntryInput {
  accountId: string
  propertyId: string
  capturedBy: string
  entryType: EntryType
  entryDate: string
  notes: string | null
  attachmentPath: string
  attachmentType: AttachmentType
}

export async function uploadAttachment(accountId: string, file: File) {
  const path = `${accountId}/${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('capture-attachments').upload(path, file)
  return { path, error }
}

export async function createCaptureEntry(input: CaptureEntryInput) {
  return supabase
    .from('capture_log')
    .insert({
      account_id: input.accountId,
      property_id: input.propertyId,
      captured_by: input.capturedBy,
      entry_type: input.entryType,
      entry_date: input.entryDate,
      notes: input.notes,
      attachment_path: input.attachmentPath,
      attachment_type: input.attachmentType,
    })
    .select()
    .single()
}

export interface ActivityLogEntry {
  id: string
  entry_type: EntryType
  entry_date: string
  notes: string | null
  attachment_path: string
  attachment_type: AttachmentType
}

// Property Profile's Activity Log tab (roadmap 7.1) — visit/communication
// entries only; receipts belong to Transactions, not here.
export async function listActivityLog(accountId: string, propertyId: string) {
  return supabase
    .from('capture_log')
    .select('id, entry_type, entry_date, notes, attachment_path, attachment_type')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .in('entry_type', ['visit', 'communication'])
    .order('entry_date', { ascending: false })
    .returns<ActivityLogEntry[]>()
}
