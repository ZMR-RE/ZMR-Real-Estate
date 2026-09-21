import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listUnits } from '../units/unitsQueries'

// Read-only unit picker source for ActionItemForm — deliberately not
// useUnits (units/useUnits.ts), which carries full add/edit CRUD state
// this form has no use for.
export function useUnitOptionsForProperty(propertyId: string | null) {
  const { accountId } = useAuth()
  const [unitOptions, setUnitOptions] = useState<{ id: string; label: string }[]>([])

  useEffect(() => {
    if (!accountId || !propertyId) {
      setUnitOptions([])
      return
    }
    listUnits(accountId, propertyId).then(({ data }) => {
      setUnitOptions((data ?? []).filter((u) => !u.archived).map((u) => ({ id: u.id, label: u.unit_label })))
    })
  }, [accountId, propertyId])

  return unitOptions
}
