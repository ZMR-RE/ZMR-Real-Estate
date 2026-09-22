import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listUnits } from '../units/unitsQueries'

// Read-only unit picker source for ActionItemForm — deliberately not
// useUnits (units/useUnits.ts), which carries full add/edit CRUD state
// this form has no use for. Roadmap 10.5 / CLAUDE.md's Cross-module data
// freshness rule — refresh is exposed so the caller can re-run it when
// the Unit field itself gains focus, picking up a unit added elsewhere
// while this form stays open, same pattern as Property Specs' Scope
// field.
export function useUnitOptionsForProperty(propertyId: string | null) {
  const { accountId } = useAuth()
  const [unitOptions, setUnitOptions] = useState<{ id: string; label: string }[]>([])

  const refresh = useCallback(async () => {
    if (!accountId || !propertyId) {
      setUnitOptions([])
      return
    }
    const { data } = await listUnits(accountId, propertyId)
    setUnitOptions((data ?? []).filter((u) => !u.archived).map((u) => ({ id: u.id, label: u.unit_label })))
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { unitOptions, refresh }
}
