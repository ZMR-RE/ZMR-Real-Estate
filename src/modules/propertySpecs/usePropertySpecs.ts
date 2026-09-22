import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listUnits, type Unit } from '../units/unitsQueries'
import {
  createPropertySpec,
  listPropertySpecs,
  updatePropertySpec,
  type PropertySpec,
  type PropertySpecInput,
} from './propertySpecsQueries'

// 'all' | 'whole_building' | a real unit id
export type ScopeFilter = string
// 'all' | a real pick-list area value
export type AreaFilter = string

export function usePropertySpecs(propertyId: string) {
  const { accountId } = useAuth()
  const [specs, setSpecs] = useState<PropertySpec[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all')

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listPropertySpecs(accountId, propertyId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setSpecs(data ?? [])
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Roadmap 7.4 revision / CLAUDE.md's Cross-module data freshness rule —
  // Scope's unit options come from a different module (Units, 7.2), which
  // now lives on the same page as this section rather than a different
  // screen. Fetched on mount, and refreshUnitOptions is re-run whenever
  // the Add/Edit form opens and whenever the Scope field itself gains
  // focus, so a unit added elsewhere while this section stays mounted
  // still shows up as a Scope option with no reload or other step.
  const refreshUnitOptions = useCallback(async () => {
    if (!accountId) return
    const { data } = await listUnits(accountId, propertyId)
    setUnits(data ?? [])
  }, [accountId, propertyId])

  useEffect(() => {
    refreshUnitOptions()
  }, [refreshUnitOptions])

  const startAdding = () => {
    setEditingId(null)
    setIsAdding(true)
    refreshUnitOptions()
  }

  const startEditing = (id: string) => {
    setIsAdding(false)
    setEditingId(id)
    refreshUnitOptions()
  }

  const cancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
  }

  const add = async (input: PropertySpecInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await createPropertySpec(accountId, propertyId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const save = async (id: string, input: PropertySpecInput) => {
    setSaving(true)
    const { error: saveError } = await updatePropertySpec(id, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setEditingId(null)
    await refresh()
  }

  const filteredSpecs = specs
    .filter((spec) => {
      if (scopeFilter === 'all') return true
      if (scopeFilter === 'whole_building') return spec.unit_id === null
      return spec.unit_id === scopeFilter
    })
    .filter((spec) => areaFilter === 'all' || spec.area === areaFilter)

  return {
    specs: filteredSpecs,
    units,
    loading,
    error,
    isAdding,
    editingId,
    saving,
    scopeFilter,
    setScopeFilter,
    areaFilter,
    setAreaFilter,
    startAdding,
    startEditing,
    cancelForm,
    add,
    save,
    refreshUnitOptions,
  }
}
