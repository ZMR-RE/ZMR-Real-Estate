import { supabase } from '../../shared/supabaseClient'

// Matches the 'document_type' pick-list value the 2.5 document
// architecture already seeds (20260910220000_pick_list_options.sql),
// same category PropertySummary's old static Insurance documents
// special-case already filtered on.
const INSURANCE_DOCUMENT_CATEGORY = 'Insurance'

export interface InsurancePolicyDocument {
  id: string
  storage_path: string
  file_size: number
  uploaded_at: string
}

export interface InsurancePolicy {
  id: string
  property_id: string
  provider: string
  policy_number: string | null
  // Roadmap 7.33 (5) — contact_info (a single free-text field) is
  // superseded by the structured representative_name/phone/email below;
  // kept on the row (still selected, unlike the properties-table
  // precedents that drop a superseded column from the select entirely)
  // only because InsurancePolicy already flows through several places —
  // no code reads it going forward.
  contact_info: string | null
  coverage_start_date: string | null
  coverage_end_date: string | null
  premium_amount: string | null
  deductible: string | null
  named_insured: string | null
  representative_name: string | null
  representative_phone: string | null
  representative_email: string | null
  // Additional scope on top of 7.33 (5) — payment_plan is pick-list-
  // backed (see the 20260922130000 migration's seeded
  // 'insurance_payment_plan' list); policy_discounts is plain free text.
  payment_plan: string | null
  policy_discounts: string | null
  documents: InsurancePolicyDocument[]
}

export interface InsurancePolicyInput {
  provider: string
  policy_number: string | null
  coverage_start_date: string | null
  coverage_end_date: string | null
  premium_amount: string | null
  deductible: string | null
  named_insured: string | null
  representative_name: string | null
  representative_phone: string | null
  representative_email: string | null
  payment_plan: string | null
  policy_discounts: string | null
}

// Roadmap 7.33 (5) — Active/Expired, computed at render time from
// coverage_end_date vs today rather than stored, same "real-time check,
// not a snapshot" approach as the Action Queue priority color system
// (7.15). No end date set means ongoing coverage — Active, not a guess.
export type InsuranceStatus = 'active' | 'expired'

export function getInsuranceStatus(policy: Pick<InsurancePolicy, 'coverage_end_date'>): InsuranceStatus {
  if (!policy.coverage_end_date) return 'active'
  return policy.coverage_end_date < new Date().toISOString().slice(0, 10) ? 'expired' : 'active'
}

// Personality pass — color-coded "story" numbers, extending the same
// --success/--warning/--danger vocabulary the Units-occupied stat card
// and Action Queue priority (7.15) already use to Insurance's own
// coverage-expiration date. Same "real-time check, not a snapshot"
// approach as getInsuranceStatus above. No end date set means ongoing
// coverage — success, not a guess at when it might lapse.
const EXPIRING_VERY_SOON_DAYS = 7
const EXPIRING_SOON_DAYS = 30

export type InsuranceExpirationUrgency = 'success' | 'warning' | 'danger'

// Whole days until coverage_end_date, negative once past it. Exported
// separately from the urgency color so the UI can also show a plain
// "expires in N days" / "expired N days ago" phrase, not just a color.
export function daysUntilExpiration(policy: Pick<InsurancePolicy, 'coverage_end_date'>): number | null {
  if (!policy.coverage_end_date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(`${policy.coverage_end_date}T00:00:00`)
  return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// danger covers both "already expired" (days <= 0) and "very close"
// (within a week) — the task's own "red if expired/very close" wording
// collapses both into one color rather than a 4th visual tier.
export function insuranceExpirationUrgency(policy: Pick<InsurancePolicy, 'coverage_end_date'>): InsuranceExpirationUrgency {
  const days = daysUntilExpiration(policy)
  if (days === null) return 'success'
  if (days <= EXPIRING_VERY_SOON_DAYS) return 'danger'
  if (days <= EXPIRING_SOON_DAYS) return 'warning'
  return 'success'
}

// New build item — Insurance as a historical ledger, exact pattern of
// Property Tax Installments (9.5) including its multi-document revision:
// documents point back at which policy entry they belong to
// (documents.property_insurance_policy_id) rather than this table
// holding document FKs itself, so a policy entry can carry any number
// of documents (unlike tax's two fixed slots, an insurance entry has
// just one set — no slot-number column needed here).
const POLICY_SELECT = `
  id, property_id, provider, policy_number, contact_info,
  coverage_start_date, coverage_end_date, premium_amount, deductible,
  named_insured, representative_name, representative_phone, representative_email,
  payment_plan, policy_discounts,
  documents:documents!documents_property_insurance_policy_id_fkey(id, storage_path, file_size, uploaded_at)
`

export async function listInsurancePolicies(accountId: string, propertyId: string) {
  return supabase
    .from('property_insurance_policies')
    .select(POLICY_SELECT)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('coverage_start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .returns<InsurancePolicy[]>()
}

export async function createInsurancePolicy(accountId: string, propertyId: string, input: InsurancePolicyInput) {
  return supabase
    .from('property_insurance_policies')
    .insert({ ...input, account_id: accountId, property_id: propertyId })
    .select(POLICY_SELECT)
    .single()
}

export async function updateInsurancePolicy(id: string, input: InsurancePolicyInput) {
  return supabase.from('property_insurance_policies').update(input).eq('id', id).select(POLICY_SELECT).single()
}

// Uploads straight into the 2.5 document architecture (private
// "documents" bucket + documents table row), same storage convention
// Property Tax's uploadTaxInstallmentDocument uses. Requires a real
// policy id, so the policy row must already exist (created first, with
// no documents, if this is a brand-new one) before any document upload
// for it can happen.
export async function uploadInsurancePolicyDocument(
  accountId: string,
  propertyId: string,
  insurancePolicyId: string,
  uploadedBy: string,
  file: File,
) {
  const path = `${accountId}/${propertyId}/${INSURANCE_DOCUMENT_CATEGORY}/${crypto.randomUUID()}-${file.name}`

  const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
  if (uploadError) {
    return { data: null, error: uploadError }
  }

  const { data, error: insertError } = await supabase
    .from('documents')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      category: INSURANCE_DOCUMENT_CATEGORY,
      property_insurance_policy_id: insurancePolicyId,
      uploaded_by: uploadedBy,
      storage_path: path,
      file_size: file.size,
    })
    .select('id, storage_path, file_size, uploaded_at')
    .single()

  if (insertError) {
    return { data: null, error: insertError }
  }

  return { data: data as InsurancePolicyDocument, error: null }
}
