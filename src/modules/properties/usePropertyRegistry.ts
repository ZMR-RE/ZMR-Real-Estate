import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useLlcs } from '../llcs/useLlcs'
import { useHoldingCompanies } from '../holdingCompanies/useHoldingCompanies'
import {
  createProperty,
  listProperties,
  updateProperty,
  type Property,
  type PropertyInput,
} from './propertiesQueries'

const BLANK_PROPERTY: PropertyInput = {
  name: '',
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
  county_township: null,
  square_footage: null,
  lot_size: null,
  zoning_use_code: null,
  bedroom_count: null,
  bathroom_count: null,
  basement: null,
  garage_parking_spaces: null,
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

  const save = async (input: PropertyInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = selectedProperty
      ? await updateProperty(selectedProperty.id, input)
      : await createProperty(accountId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setError(null)
    setIsCreating(false)
    setSelectedId(null)
    await refresh()
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
    formKey: selectedProperty?.id ?? 'new',
    formInitialValues,
    saving,
    startCreating,
    selectProperty,
    cancelForm,
    save,
  }
}
