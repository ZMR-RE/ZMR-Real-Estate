import { supabase } from '../../shared/supabaseClient'

// Roadmap O1-A (Batch A/G/I) — owner_kind onward are the generalized
// entity/individual identity and tax-classification fields added by
// 20260925010000_llcs_entity_profile_fields.sql. owner_kind is nullable
// with no default and every pre-existing row is backfilled to null
// (unresolved) rather than guessed 'entity' — see that migration's own
// comment. Contact info deliberately does NOT live here: see
// contactsQueries.ts (reusable contacts/methods/links), which replaced an
// earlier draft's flat contact_name/_role/_email/_phone columns on this
// table.
export interface Llc {
  id: string
  account_id: string
  name: string
  ein: string | null
  formation_state: string | null
  registered_agent: string | null
  formation_date: string | null
  annual_report_due_date: string | null
  holding_company_id: string | null
  holding_company: { id: string; name: string } | null
  archived: boolean
  owner_kind: 'individual' | 'entity' | null
  display_name: string | null
  legal_structure: 'llc' | 'corporation' | 'partnership' | 'trust' | 'other' | 'unknown' | null
  mailing_address: string | null
  mailing_city: string | null
  mailing_state: string | null
  mailing_zip: string | null
  notes: string | null
  membership: 'single_member' | 'multiple_members' | 'unknown' | null
  federal_tax_treatment: 'unknown' | 'disregarded_entity' | 'partnership' | 's_corporation' | 'c_corporation' | 'other' | null
  federal_tax_treatment_effective_date: string | null
  tax_verification_status: 'needs_review' | 'user_verified' | null
  tax_verified_by: string | null
  tax_verified_at: string | null
  last_verified_date: string | null
  last_verified_by: string | null
}

// Unchanged from before this batch — the existing Settings "Organization
// types" add/edit form (LlcForm.tsx) keeps using exactly this shape.
// Extending it to require every new profile field would break that
// already-shipped form for no reason; the new Identity/Tax classification
// edit forms on the entity profile use EntityProfileInput below instead,
// via a separate partial-update function.
export type LlcInput = Omit<
  Llc,
  | 'id'
  | 'account_id'
  | 'holding_company'
  | 'archived'
  | 'owner_kind'
  | 'display_name'
  | 'legal_structure'
  | 'mailing_address'
  | 'mailing_city'
  | 'mailing_state'
  | 'mailing_zip'
  | 'notes'
  | 'membership'
  | 'federal_tax_treatment'
  | 'federal_tax_treatment_effective_date'
  | 'tax_verification_status'
  | 'tax_verified_by'
  | 'tax_verified_at'
  | 'last_verified_date'
  | 'last_verified_by'
>

// Partial-update shape for the entity profile's Identity/Tax
// classification boxes — every field optional, since Save on one box
// (e.g. Tax classification) must never require re-submitting the other
// box's fields.
export type EntityProfileInput = Partial<
  Pick<
    Llc,
    | 'owner_kind'
    | 'display_name'
    | 'legal_structure'
    | 'mailing_address'
    | 'mailing_city'
    | 'mailing_state'
    | 'mailing_zip'
    | 'notes'
    | 'membership'
    | 'federal_tax_treatment'
    | 'federal_tax_treatment_effective_date'
  >
>

const LLC_COLUMNS =
  'id, account_id, name, ein, formation_state, registered_agent, formation_date, annual_report_due_date, holding_company_id, holding_company:holding_companies(id, name), archived, owner_kind, display_name, legal_structure, mailing_address, mailing_city, mailing_state, mailing_zip, notes, membership, federal_tax_treatment, federal_tax_treatment_effective_date, tax_verification_status, tax_verified_by, tax_verified_at, last_verified_date, last_verified_by'

export async function listLlcs(accountId: string) {
  return supabase.from('llcs').select(LLC_COLUMNS).eq('account_id', accountId).order('name').returns<Llc[]>()
}

// The entity profile page's own single-record fetch — every column,
// unlike listLlcs' picker-shaped rows.
export async function getLlc(accountId: string, id: string) {
  return supabase.from('llcs').select(LLC_COLUMNS).eq('account_id', accountId).eq('id', id).returns<Llc[]>().single()
}

// Entity profile Identity/Tax classification boxes' own Save — a partial
// update distinct from updateLlc below (which the Settings management
// form still uses, always with the full LlcInput shape).
export async function updateLlcProfile(id: string, input: EntityProfileInput) {
  return supabase.from('llcs').update(input).eq('id', id).select(LLC_COLUMNS).returns<Llc[]>().single()
}

// Sets last_verified_date/_by — the ONLY function that ever writes these
// two columns. No other update path (updateLlc, updateLlcProfile) may
// touch them, so a routine field edit never silently advances "last
// verified" as a side effect.
export async function markLlcVerified(id: string, verifiedBy: string) {
  return supabase
    .from('llcs')
    .update({ last_verified_date: new Date().toISOString().slice(0, 10), last_verified_by: verifiedBy })
    .eq('id', id)
    .select(LLC_COLUMNS)
    .returns<Llc[]>()
    .single()
}

export async function createLlc(accountId: string, input: LlcInput) {
  return supabase
    .from('llcs')
    .insert({ ...input, account_id: accountId })
    .select(LLC_COLUMNS)
    .returns<Llc[]>()
    .single()
}

// Roadmap 8.2a — the "edit" half of the previously add-only record.
export async function updateLlc(id: string, input: LlcInput) {
  return supabase.from('llcs').update(input).eq('id', id).select(LLC_COLUMNS).returns<Llc[]>().single()
}

// Roadmap 8.2a — archive/restore rather than hard-delete: a property may
// still reference an archived Organization type historically.
export async function setLlcArchived(id: string, archived: boolean) {
  return supabase.from('llcs').update({ archived }).eq('id', id).select(LLC_COLUMNS).returns<Llc[]>().single()
}
