import { supabase } from '../../shared/supabaseClient'

export interface VendorEstimate {
  id: string
  job_id: string
  vendor_id: string
  vendor: { id: string; name: string }
  amount: number
  estimate_date: string
  notes: string | null
}

export interface EstimateJob {
  id: string
  property_id: string
  unit_id: string | null
  unit: { id: string; unit_label: string } | null
  title: string
  action_item_id: string | null
  action_item: { id: string; title: string } | null
  chosen_estimate_id: string | null
  decision_notes: string | null
  decided_at: string | null
  created_at: string
  estimates: VendorEstimate[]
}

const VENDOR_ESTIMATE_COLUMNS = 'id, job_id, vendor_id, vendor:vendors(id, name), amount, estimate_date, notes'

// estimate_jobs and vendor_estimates have two FKs pointing at each
// other (vendor_estimates.job_id, and estimate_jobs.chosen_estimate_id
// the other direction), so PostgREST can't infer which relationship a
// plain `vendor_estimates(...)` embed means — same ambiguity
// capture_log's multiple vendor/tenant FKs already required
// !constraint_name to resolve.
const ESTIMATE_JOB_COLUMNS = `id, property_id, unit_id, unit:units(id, unit_label), title, action_item_id, action_item:action_items(id, title), chosen_estimate_id, decision_notes, decided_at, created_at, estimates:vendor_estimates!vendor_estimates_job_id_fkey(${VENDOR_ESTIMATE_COLUMNS})`

// Roadmap 8.11(b) — one property's whole comparison history, newest
// first. estimates come back nested (PostgREST's own embed, not a
// second round trip) since a job is never shown without its estimates
// — there's nothing to compare otherwise.
export async function listEstimateJobs(accountId: string, propertyId: string) {
  return supabase
    .from('estimate_jobs')
    .select(ESTIMATE_JOB_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .returns<EstimateJob[]>()
}

// Roadmap 8.11(b) — the action-item → estimate-job cross-reference's
// read side (ActionItemDetail.tsx). A task can in principle have more
// than one comparison logged against it over time, so this returns a
// list, not a single nullable job.
export async function listEstimateJobsForActionItem(accountId: string, actionItemId: string) {
  return supabase
    .from('estimate_jobs')
    .select(ESTIMATE_JOB_COLUMNS)
    .eq('account_id', accountId)
    .eq('action_item_id', actionItemId)
    .order('created_at', { ascending: false })
    .returns<EstimateJob[]>()
}

export interface EstimateJobInput {
  unitId: string | null
  title: string
  actionItemId: string | null
}

export async function createEstimateJob(accountId: string, propertyId: string, input: EstimateJobInput) {
  return supabase
    .from('estimate_jobs')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      unit_id: input.unitId,
      title: input.title,
      action_item_id: input.actionItemId,
    })
    .select(ESTIMATE_JOB_COLUMNS)
    .single<EstimateJob>()
}

export interface VendorEstimateInput {
  vendorId: string
  amount: number
  estimateDate: string
  notes: string | null
}

export async function createVendorEstimate(accountId: string, jobId: string, input: VendorEstimateInput) {
  return supabase
    .from('vendor_estimates')
    .insert({
      account_id: accountId,
      job_id: jobId,
      vendor_id: input.vendorId,
      amount: input.amount,
      estimate_date: input.estimateDate,
      notes: input.notes,
    })
    .select(VENDOR_ESTIMATE_COLUMNS)
    .single<VendorEstimate>()
}

// Roadmap 8.11(b) — "which one was chosen and why." Status (Open vs.
// Decided) is derived from chosen_estimate_id being set, not stored —
// this is the one write that sets it. Re-choosing a different estimate
// later just overwrites all three fields; nothing about a decision is
// locked, unlike e.g. a locked financial period.
export async function chooseEstimate(jobId: string, estimateId: string, decisionNotes: string | null) {
  return supabase
    .from('estimate_jobs')
    .update({
      chosen_estimate_id: estimateId,
      decision_notes: decisionNotes,
      decided_at: new Date().toISOString().slice(0, 10),
    })
    .eq('id', jobId)
    .select(ESTIMATE_JOB_COLUMNS)
    .single<EstimateJob>()
}
