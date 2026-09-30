import { supabase } from '../../shared/supabaseClient'

// Every Supabase call for entity Branding & documents. One row per entity
// (entity_document_branding) on the existing entity record; logo files are
// kept as permanent versions (entity_logo_versions + Storage).

export interface BrandingRow {
  entity_id: string
  account_id: string
  heading_color: string | null
  accent_color: string | null
  highlight_color: string | null
  secondary_color: string | null
  reply_to_email: string | null
  document_phone: string | null
  website: string | null
  payment_instructions: string | null
  paper_size: 'letter' | 'a4'
  show_legal_name: boolean
  default_invoice_note: string | null
  default_receipt_note: string | null
  document_footer: string | null
  current_logo_id: string | null
  version: number
}

export interface LogoVersionRow {
  id: string
  storage_path: string
  sha256: string
  format: 'PNG' | 'JPEG'
  width: number
  height: number
  byte_size: number
  uploaded_at: string
}

export interface BrandingEntityRow {
  id: string
  name: string
  display_name: string | null
  mailing_address: string | null
  mailing_city: string | null
  mailing_state: string | null
  mailing_zip: string | null
}

export async function listBrandingEntities(accountId: string) {
  return supabase
    .from('llcs')
    .select('id, name, display_name, mailing_address, mailing_city, mailing_state, mailing_zip')
    .eq('account_id', accountId)
    .eq('archived', false)
    .order('name')
    .returns<BrandingEntityRow[]>()
}

export async function getBranding(entityId: string) {
  return supabase.from('entity_document_branding').select('*').eq('entity_id', entityId).maybeSingle<BrandingRow>()
}

export async function getLogoVersion(id: string) {
  return supabase.from('entity_logo_versions').select('id, storage_path, sha256, format, width, height, byte_size, uploaded_at').eq('id', id).single().returns<LogoVersionRow>()
}

export type BrandingInput = Omit<BrandingRow, 'entity_id' | 'account_id' | 'version'>

// Insert the first settings, or update only if nobody saved since they were
// read (a stale save matches no row → PGRST116).
export async function saveBranding(accountId: string, entityId: string, expectedVersion: number | null, input: BrandingInput) {
  if (expectedVersion === null) {
    return supabase.from('entity_document_branding').insert({ entity_id: entityId, account_id: accountId, ...input }).select().single().returns<BrandingRow>()
  }
  return supabase.from('entity_document_branding').update(input).eq('entity_id', entityId).eq('version', expectedVersion).select().single().returns<BrandingRow>()
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// Store a new logo version (never overwrites an earlier one).
export async function uploadLogoVersion(accountId: string, entityId: string, file: Blob, format: 'PNG' | 'JPEG', width: number, height: number) {
  const bytes = await file.arrayBuffer()
  const path = `${accountId}/entity-branding/${entityId}/${crypto.randomUUID()}.${format === 'PNG' ? 'png' : 'jpg'}`
  const upload = await supabase.storage.from('documents').upload(path, file, { contentType: format === 'PNG' ? 'image/png' : 'image/jpeg', upsert: false })
  if (upload.error) return { data: null, error: upload.error }
  return supabase
    .from('entity_logo_versions')
    .insert({ account_id: accountId, entity_id: entityId, storage_path: path, sha256: await sha256Hex(bytes), format, width, height, byte_size: bytes.byteLength })
    .select('id, storage_path, sha256, format, width, height, byte_size, uploaded_at')
    .single()
    .returns<LogoVersionRow>()
}

export async function downloadLogo(path: string) {
  return supabase.storage.from('documents').download(path)
}
