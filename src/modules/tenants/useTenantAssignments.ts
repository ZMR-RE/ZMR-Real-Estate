import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useTenants } from './useTenants'
import {
  createTenantUnitAssignment,
  listTenantUnitAssignments,
  setTenantUnitAssignmentArchived,
  type TenantUnitAssignment,
  type TenantUnitAssignmentInput,
} from './tenantsQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

export function useTenantAssignments(unitId: string) {
  const { accountId } = useAuth()
  const { tenantOptions, addTenant } = useTenants(accountId)
  const [assignments, setAssignments] = useState<TenantUnitAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listTenantUnitAssignments(accountId, unitId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setAssignments(data ?? [])
  }, [accountId, unitId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startAdding = () => setIsAdding(true)
  const cancelAdding = () => setIsAdding(false)

  const add = async (input: TenantUnitAssignmentInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await createTenantUnitAssignment(accountId, unitId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const toggleArchived = async (assignment: TenantUnitAssignment) => {
    setSaving(true)
    const { error: saveError } = await setTenantUnitAssignmentArchived(assignment.id, !assignment.archived)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return {
    assignments,
    loading,
    error,
    isAdding,
    saving,
    tenantOptions,
    addTenant,
    startAdding,
    cancelAdding,
    add,
    toggleArchived,
    todayDateString: todayDateString(),
  }
}
