import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listCurrentTenantsForProperty } from '../tenants/propertyTenantsQueries'
import { createUnit, listUnits, setUnitArchived, updateUnit, type Unit, type UnitInput } from './unitsQueries'

// Roadmap 7.55 (4) — each unit's own current rent, shown as a "Rent"
// line on its card (UnitsSection.tsx). Summed across that unit's own
// current (non-archived, end_date null) tenant_units rows only — never
// across other units or the whole property — so this doesn't reopen
// the property-wide co-tenant double-counting gap flagged and
// deliberately held back from the Monthly rent stat card (7.52). A
// single unit legitimately having 2+ concurrent tenant rows is a much
// narrower, already-expected surface (that's exactly what per-unit
// Tenants management already invites) than summing across an entire
// property's units.
export interface UnitWithRent extends Unit {
  currentRent: number | null
}

export function useUnits(propertyId: string) {
  const { accountId } = useAuth()
  const [units, setUnits] = useState<UnitWithRent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Roadmap 7.23 revision (T1) — archived units hidden by default, same
  // "Show archived" toggle pattern as Financial accounts. UI-only filter,
  // not a refetch: `units` always holds everything (an archived unit must
  // still resolve wherever it's historically referenced), this just
  // decides what the list renders.
  const [showArchived, setShowArchived] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const [unitsRes, tenantsRes] = await Promise.all([
      listUnits(accountId, propertyId),
      listCurrentTenantsForProperty(accountId, propertyId),
    ])
    setLoading(false)

    const fetchError = unitsRes.error?.message ?? tenantsRes.error?.message
    if (fetchError) {
      setError(fetchError)
      return
    }
    setError(null)

    const rentByUnit = new Map<string, number>()
    for (const row of tenantsRes.data ?? []) {
      if (row.unit && row.rent_amount !== null) {
        rentByUnit.set(row.unit.id, (rentByUnit.get(row.unit.id) ?? 0) + Number(row.rent_amount))
      }
    }
    setUnits((unitsRes.data ?? []).map((unit) => ({ ...unit, currentRent: rentByUnit.get(unit.id) ?? null })))
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startAdding = () => {
    setEditingId(null)
    setIsAdding(true)
  }

  const startEditing = (id: string) => {
    setIsAdding(false)
    setEditingId(id)
  }

  const cancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
  }

  const add = async (input: UnitInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await createUnit(accountId, propertyId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const save = async (id: string, input: UnitInput) => {
    setSaving(true)
    const { error: saveError } = await updateUnit(id, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setEditingId(null)
    await refresh()
  }

  const toggleArchived = async (unit: Unit) => {
    setSaving(true)
    const { error: saveError } = await setUnitArchived(unit.id, !unit.archived)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return {
    units: showArchived ? units : units.filter((u) => !u.archived),
    archivedCount: units.filter((u) => u.archived).length,
    showArchived,
    setShowArchived,
    loading,
    error,
    isAdding,
    editingId,
    saving,
    startAdding,
    startEditing,
    cancelForm,
    add,
    save,
    toggleArchived,
  }
}
