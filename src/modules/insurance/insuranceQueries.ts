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

// INS-1 — replaces the old binary Active/Expired status (roadmap 7.33
// (5)), which asserted "Active" whenever coverage_end_date was simply
// absent — a false coverage assurance from missing data, exactly what
// CLAUDE.md's Data integrity rule forbids ("never seed, infer, or guess
// a field's value"). It also compared a UTC date string
// (coverage_end_date < new Date().toISOString().slice(0,10)) against a
// local-calendar-date day count elsewhere in the same file — two
// different "today"s that could disagree near midnight. Every date here
// now goes through one local-midnight basis (parseDateOnly), and every
// label below describes which dates are ON FILE, never a verified,
// insurer-confirmed coverage state.
export type InsuranceTermStatusKind = 'within' | 'upcoming' | 'ended' | 'incomplete' | 'invalid_range'

export interface InsuranceTermStatus {
  kind: InsuranceTermStatusKind
  daysUntilStart: number | null
  daysUntilEnd: number | null
  // Batch O5 — "End date today displays 'Term ends today'; don't
  // simultaneously label it expired." Kept distinct from a plain
  // daysUntilEnd === 0 check so the UI never has to re-derive it.
  endsToday: boolean
}

function parseDateOnly(value: string): Date {
  // No 'Z' — parsed as local midnight, so this always reflects the
  // account's own calendar day regardless of the viewer's timezone,
  // consistently with every other date on this row.
  return new Date(`${value}T00:00:00`)
}

function todayAtMidnight(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

// Batch O5's four honest labels, plus a fifth (invalid_range) for a
// stored end-before-start pair — "an input error, not a valid term",
// so it is deliberately never one of the four. New saves are blocked
// from creating this state (useInsuranceLedger's validation); this
// case exists here only so a pre-existing bad row is never silently
// reinterpreted as a valid term instead of surfaced honestly.
export function computeInsuranceTermStatus(
  policy: Pick<InsurancePolicy, 'coverage_start_date' | 'coverage_end_date'>,
): InsuranceTermStatus {
  const today = todayAtMidnight()
  const start = policy.coverage_start_date ? parseDateOnly(policy.coverage_start_date) : null
  const end = policy.coverage_end_date ? parseDateOnly(policy.coverage_end_date) : null

  const daysUntilStart = start ? daysBetween(today, start) : null
  const daysUntilEnd = end ? daysBetween(today, end) : null

  if (start && end && end.getTime() < start.getTime()) {
    return { kind: 'invalid_range', daysUntilStart, daysUntilEnd, endsToday: false }
  }

  if (start && end) {
    if (daysUntilEnd! < 0) return { kind: 'ended', daysUntilStart, daysUntilEnd, endsToday: false }
    if (daysUntilStart! > 0) return { kind: 'upcoming', daysUntilStart, daysUntilEnd, endsToday: false }
    return { kind: 'within', daysUntilStart, daysUntilEnd, endsToday: daysUntilEnd === 0 }
  }

  // A known past end date is "Term ended" even without a known start —
  // per Batch O5's own wording, that rule stands on its own. A known
  // end that is today or still ahead, with no start on file, can't be
  // placed relative to today (we don't know if it has even started) —
  // "Dates incomplete", not a guess either way.
  if (end && !start) {
    if (daysUntilEnd! < 0) return { kind: 'ended', daysUntilStart, daysUntilEnd, endsToday: false }
    return { kind: 'incomplete', daysUntilStart, daysUntilEnd, endsToday: false }
  }

  // A known future start with no end on file is unambiguously
  // "Upcoming" — no end date is needed to know coverage hasn't started
  // yet. A start that is today or in the past with no end on file is
  // exactly the old bug's shape (a single known date, missing the other
  // one) — "Dates incomplete", never "Within recorded term".
  if (start && !end) {
    if (daysUntilStart! > 0) return { kind: 'upcoming', daysUntilStart, daysUntilEnd, endsToday: false }
    return { kind: 'incomplete', daysUntilStart, daysUntilEnd, endsToday: false }
  }

  return { kind: 'incomplete', daysUntilStart: null, daysUntilEnd: null, endsToday: false }
}

export type InsuranceTermUrgency = 'success' | 'accent' | 'warning' | 'danger' | 'neutral'

const EXPIRING_VERY_SOON_DAYS = 7
const EXPIRING_SOON_DAYS = 30

// Batch O5 — "Keep existing 7/30-day urgency thresholds only for known
// expiration dates, paired color with words" (the label itself, never
// color alone). Only a term with a known end date still in force can
// carry that urgency color; every other kind gets a color that never
// reads as a coverage assurance — accent (scheduled, not yet in force)
// for upcoming, neutral (no assurance either way) for incomplete data.
export function insuranceTermUrgency(status: InsuranceTermStatus): InsuranceTermUrgency {
  switch (status.kind) {
    case 'ended':
    case 'invalid_range':
      return 'danger'
    case 'within':
      if (status.endsToday || (status.daysUntilEnd !== null && status.daysUntilEnd <= EXPIRING_VERY_SOON_DAYS)) {
        return 'danger'
      }
      if (status.daysUntilEnd !== null && status.daysUntilEnd <= EXPIRING_SOON_DAYS) return 'warning'
      return 'success'
    case 'upcoming':
      return 'accent'
    case 'incomplete':
    default:
      return 'neutral'
  }
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
