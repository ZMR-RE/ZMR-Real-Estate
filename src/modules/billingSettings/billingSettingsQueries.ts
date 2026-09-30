import { supabase } from '../../shared/supabaseClient'

// Every Supabase call for the Stage 1 billing settings (RP1 Tenancy &
// billing, RP2 billing entity / entity invoicing). Structured records only —
// values are entered here by the owner, never derived from ownership or
// lease documents.

export interface BillingTermsRow {
  lease_id: string
  frequency: 'monthly'
  due_day: number | null
  effective_from: string | null
  effective_to: string | null
  prorate_rule: 'none' | 'daily' | 'manual'
  prorate_notes: string | null
  continues_lease_id: string | null
  version: number
}

export interface TenancyRow {
  id: string
  account_id: string
  property_id: string
  rent_amount: number | null
  start_date: string
  end_date: string | null
  archived: boolean
  unit: { unit_label: string } | null
  property: { address: string | null } | null
  lease_tenants: { id: string; is_billing_recipient: boolean; tenant: { id: string; name: string; email: string | null } | null }[]
  // One-to-one (lease_id is the terms table's primary key); PostgREST may
  // return an object or a single-element array depending on version.
  lease_billing_terms: BillingTermsRow | BillingTermsRow[] | null
}

export function termsOf(row: TenancyRow): BillingTermsRow | null {
  const t = row.lease_billing_terms
  return Array.isArray(t) ? (t[0] ?? null) : t
}

const TENANCY_COLUMNS =
  'id, account_id, property_id, rent_amount, start_date, end_date, archived, unit:units(unit_label), property:properties(address), lease_tenants(id, is_billing_recipient, tenant:tenants(id, name, email)), lease_billing_terms!lease_billing_terms_lease_id_fkey(lease_id, frequency, due_day, effective_from, effective_to, prorate_rule, prorate_notes, continues_lease_id, version)'

export async function listTenantTenancies(tenantId: string) {
  const links = await supabase.from('lease_tenants').select('lease_id').eq('tenant_id', tenantId).returns<{ lease_id: string }[]>()
  if (links.error) return { data: null, error: links.error }
  const ids = (links.data ?? []).map((l) => l.lease_id)
  if (ids.length === 0) return { data: [] as TenancyRow[], error: null }
  return supabase.from('leases').select(TENANCY_COLUMNS).in('id', ids).eq('archived', false).order('start_date', { ascending: false }).returns<TenancyRow[]>()
}

export interface BillingTermsInput {
  due_day: number | null
  effective_from: string | null
  effective_to: string | null
  prorate_rule: 'none' | 'daily' | 'manual'
  prorate_notes: string | null
  continues_lease_id: string | null
}

export interface ContinuityOption {
  id: string
  start_date: string
  end_date: string | null
  unit: { unit_label: string } | null
  property: { address: string | null } | null
  lease_tenants: { tenant: { name: string } | null }[]
}

// The account's tenancies, for choosing which earlier tenancy a tenancy's
// billing continues from (explicit owner choice; nothing is suggested).
export async function listContinuityOptions(accountId: string) {
  return supabase
    .from('leases')
    .select('id, start_date, end_date, unit:units(unit_label), property:properties(address), lease_tenants(tenant:tenants(name))')
    .eq('account_id', accountId)
    .order('start_date', { ascending: false })
    .returns<ContinuityOption[]>()
}

// Insert the tenancy's first terms, or update them only if nobody changed
// them since they were read (version check; a stale save matches no row).
export async function saveBillingTerms(accountId: string, leaseId: string, expectedVersion: number | null, input: BillingTermsInput) {
  if (expectedVersion === null) {
    return supabase.from('lease_billing_terms').insert({ lease_id: leaseId, account_id: accountId, ...input }).select().single()
  }
  return supabase.from('lease_billing_terms').update(input).eq('lease_id', leaseId).eq('version', expectedVersion).select().single()
}

export async function setBillingRecipient(leaseTenantId: string, isRecipient: boolean) {
  return supabase.from('lease_tenants').update({ is_billing_recipient: isRecipient }).eq('id', leaseTenantId)
}

export interface EntityOption {
  id: string
  name: string
  display_name: string | null
  invoice_code: string | null
}

export async function listBillingEntities(accountId: string) {
  return supabase.from('llcs').select('id, name, display_name, invoice_code').eq('account_id', accountId).eq('archived', false).order('name').returns<EntityOption[]>()
}

export interface PropertyBillingRow {
  id: string
  billing_entity_id: string | null
  payment_instructions_override: string | null
}

export async function getPropertyBilling(propertyId: string) {
  return supabase.from('properties').select('id, billing_entity_id, payment_instructions_override').eq('id', propertyId).single().returns<PropertyBillingRow>()
}

export async function setPropertyBilling(propertyId: string, input: Omit<PropertyBillingRow, 'id'>) {
  return supabase.from('properties').update(input).eq('id', propertyId).select('id').single()
}

// The entity's default instructions (Branding & documents), to show what a
// property inherits when it has no override of its own.
export async function getEntityDefaultPaymentInstructions(entityId: string) {
  return supabase
    .from('entity_document_branding')
    .select('payment_instructions')
    .eq('entity_id', entityId)
    .maybeSingle<{ payment_instructions: string | null }>()
}

export interface EntityInvoicingRow {
  id: string
  name: string
  display_name: string | null
  invoice_code: string | null
}

export async function getEntityInvoicing(entityId: string) {
  return supabase
    .from('llcs')
    .select('id, name, display_name, invoice_code')
    .eq('id', entityId)
    .single()
    .returns<EntityInvoicingRow>()
}

export async function getInvoiceSequence(entityId: string) {
  return supabase
    .from('document_sequences')
    .select('next_value, first_issued_at')
    .eq('entity_id', entityId)
    .eq('doc_type', 'invoice')
    .maybeSingle()
    .returns<{ next_value: number; first_issued_at: string | null } | null>()
}

// Reply-to email, contact details and the DEFAULT payment instructions live
// in the entity's Branding & documents (entity_document_branding).
export interface EntityInvoicingInput {
  invoice_code: string | null
}

export async function updateEntityInvoicing(entityId: string, input: EntityInvoicingInput) {
  return supabase.from('llcs').update(input).eq('id', entityId).select('id').single()
}

export async function setInvoiceSequenceStart(entityId: string, nextValue: number) {
  return supabase.rpc('set_document_sequence_start', { p_entity_id: entityId, p_doc_type: 'invoice', p_next_value: nextValue })
}
