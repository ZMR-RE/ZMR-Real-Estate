import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { createUnit, listUnits, setUnitArchived, updateUnit, type Unit, type UnitInput } from './unitsQueries'

// Roadmap "Units/Lease/Tenant rebuild" Stage 5 — reverts the brief
// 7.55-era currentRent/UnitWithRent addition (which summed
// tenant_units.rent_amount per unit, the exact per-tenant-row double-
// counting risk this whole rebuild exists to retire). Rent/tenant/
// lease-end-date "at a glance" now comes from each unit's own
// useLeases call (UnitCard.tsx), not from here — this hook goes back to
// being purely about the units list itself (label/status/archived).
export function useUnits(propertyId: string) {
  const { accountId } = useAuth()
  const [units, setUnits] = useState<Unit[]>([])
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
    const { data, error: fetchError } = await listUnits(accountId, propertyId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setUnits(data ?? [])
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
