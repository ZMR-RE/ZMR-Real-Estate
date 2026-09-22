import { supabase } from '../../shared/supabaseClient'

export interface PropertySpec {
  id: string
  property_id: string
  unit_id: string | null
  area: string | null
  label: string
  value: string
  updated_at: string
}

export interface PropertySpecInput {
  unitId: string | null
  area: string
  label: string
  value: string
}

const PROPERTY_SPEC_COLUMNS = 'id, property_id, unit_id, area, label, value, updated_at'

// Roadmap 7.4 revision — one property-level list (Scope, i.e. whole
// building vs a specific unit, is encoded by unit_id as it always was),
// replacing the previous split of a property-wide fetch plus a separate
// per-unit-scoped fetch nested inside each unit's card. Everything for
// the property comes back in one call; Scope/Area filtering happens
// client-side (same pattern as Quick Capture History's Complete/Type
// filters, useCaptureHistory.ts).
export async function listPropertySpecs(accountId: string, propertyId: string) {
  return supabase
    .from('property_specs')
    .select(PROPERTY_SPEC_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('label')
    .returns<PropertySpec[]>()
}

export async function createPropertySpec(accountId: string, propertyId: string, input: PropertySpecInput) {
  return supabase
    .from('property_specs')
    .insert({
      account_id: accountId,
      property_id: propertyId,
      unit_id: input.unitId,
      area: input.area || null,
      label: input.label,
      value: input.value,
    })
    .select(PROPERTY_SPEC_COLUMNS)
    .single<PropertySpec>()
}

export async function updatePropertySpec(id: string, input: PropertySpecInput) {
  return supabase
    .from('property_specs')
    .update({
      unit_id: input.unitId,
      area: input.area || null,
      label: input.label,
      value: input.value,
    })
    .eq('id', id)
    .select(PROPERTY_SPEC_COLUMNS)
    .single<PropertySpec>()
}
