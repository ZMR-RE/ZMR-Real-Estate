import { supabase } from '../../shared/supabaseClient'
import type { AttachmentType, EntryType } from '../capture/captureQueries'

export interface QueueEntry {
  id: string
  entry_type: EntryType
  entry_date: string
  attachment_path: string
  attachment_type: AttachmentType
  property: { id: string; name: string } | null
}

export async function listUnreconciled(accountId: string, propertyId: string | null) {
  let query = supabase
    .from('capture_log')
    .select(
      'id, entry_type, entry_date, attachment_path, attachment_type, property:properties(id, name)',
    )
    .eq('account_id', accountId)
    .eq('reconciled', false)
    .order('entry_date', { ascending: false })

  if (propertyId) {
    query = query.eq('property_id', propertyId)
  }

  return query.returns<QueueEntry[]>()
}

export async function markReconciled(id: string) {
  return supabase
    .from('capture_log')
    .update({ reconciled: true, reconciled_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

export async function getAttachmentSignedUrl(path: string) {
  return supabase.storage.from('capture-attachments').createSignedUrl(path, 60)
}
