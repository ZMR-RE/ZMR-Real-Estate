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
