import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useLlcs } from '../llcs/useLlcs'
import { useHoldingCompanies } from '../holdingCompanies/useHoldingCompanies'
import {
  listProperties,
  updateProperty,
  type Property,
  type PropertyInput,
} from './propertiesQueries'

const BLANK_PROPERTY: PropertyInput = {
  name: null,
  llc_id: null,
  address: null,
  city: null,
  state: null,
  zip: null,
  insurance_provider: null,
  insurance_policy_number: null,
  contact_email: null,
  purchase_price: null,
  status: 'active',
  purchase_date: null,
  property_type: null,
  purchase_method: null,
  property_tax_id: null,
  county: null,
  township: null,
  square_footage: null,
  lot_size: null,
  municipal_zoning_code: null,
  county_assessor_use_code: null,
  bedroom_count: null,
  bathroom_count: null,
  basement: null,
  garage_spaces: null,
  street_parking: null,
  parking_notes: null,
  lot_size_value: null,
  lot_size_unit: null,
  year_built: null,
  exterior_wall_materials: [],
  owner_name: null,
  contact_phone: null,
}

export function usePropertyRegistry() {
  const { accountId } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const { llcOptions, addLlc } = useLlcs(accountId)
  const { holdingCompanyOptions, addHoldingCompany } = useHoldingCompanies(accountId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  // Batch I5 — same stale-edit protection as usePropertyProfile; this is the
  // second caller of updateProperty, and both must guard or the guard is
  // a bypass waiting to happen.
  const [conflict, setConflict] = useState<Property | null>(null)
  const [formResetKey, setFormResetKey] = useState(0)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listProperties(accountId)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setProperties(data ?? [])
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const selectedProperty = properties.find((p) => p.id === selectedId) ?? null
  const formInitialValues: PropertyInput = selectedProperty ?? BLANK_PROPERTY

  const startCreating = () => {
    setSelectedId(null)
    setIsCreating(true)
  }

  const selectProperty = (id: string) => {
    setIsCreating(false)
    setSelectedId(id)
  }

  const cancelForm = () => {
    setIsCreating(false)
    setSelectedId(null)
  }

  // Package 1 completion — this hook's own create path (createProperty,
  // called directly, no idempotency/ownership) is now unreachable: the
  // real UI never mounts PropertyForm with formPropertyId === null
  // anymore (PropertyRegistry.tsx renders PropertyCreationWizard for
  // that state instead). Rather than leave the branch in place as dead
  // code a future caller could accidentally resurrect, save() now
  // refuses outright when there's no selectedProperty to update —
  // creation only ever happens through create_property_with_ownership
  // (usePropertyCreationWizard.ts), never through this function, by
  // construction, not just by the current callers' good behavior.
  const save = async (input: PropertyInput) => {
    if (!accountId) return
    if (!selectedProperty) {
      setError('This form only edits an existing property — use the property-creation wizard to add a new one.')
      return
    }
    setSaving(true)

    const result = await updateProperty(selectedProperty.id, input, selectedProperty.updated_at)
    setSaving(false)
    if (result.kind === 'conflict') {
      // Surface the newer row WITHOUT refresh(): refresh() flips `loading`,
      // and PropertyRegistry unmounts the form while loading, which would
      // destroy the user's draft. The baseline (selectedProperty.updated_at)
      // is left as-is so a retried Save is refused again.
      setError(null)
      setConflict(result.latest)
      return
    }
    if (result.kind === 'not_found') {
      setError('This property no longer exists or is no longer accessible.')
      return
    }
    if (result.kind === 'error') {
      setError(result.message)
      return
    }

    setError(null)
    setConflict(null)
    setIsCreating(false)
    setSelectedId(null)
    await refresh()
  }

  const keepEditingAfterConflict = () => setConflict(null)

  const discardDraftAndLoadLatest = () => {
    if (conflict) setProperties((prev) => prev.map((p) => (p.id === conflict.id ? conflict : p)))
    setConflict(null)
    setFormResetKey((k) => k + 1)
  }

  return {
    properties,
    llcOptions,
    createLlc: addLlc,
    holdingCompanyOptions,
    createHoldingCompany: addHoldingCompany,
    loading,
    error,
    isFormOpen: isCreating || selectedProperty !== null,
    // formResetKey is part of the key so an explicit discard-and-reload
    // remounts (re-seeds) the form; a plain conflict leaves the key alone
    // and the draft intact.
    formKey: `${selectedProperty?.id ?? 'new'}-${formResetKey}`,
    conflict,
    keepEditingAfterConflict,
    discardDraftAndLoadLatest,
    // Roadmap 7.32 (6) — null while creating a brand-new property (no
    // row exists yet to attach a photo document to); PropertyForm hides
    // the photo upload field entirely in that case rather than erroring.
    formPropertyId: selectedProperty?.id ?? null,
    formInitialValues,
    saving,
    startCreating,
    selectProperty,
    cancelForm,
    save,
  }
}
