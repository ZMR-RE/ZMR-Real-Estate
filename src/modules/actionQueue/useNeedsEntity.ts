import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listLockedYears, listNeedsEntityDates } from '../financials/transactionEntityQueries'
import { needsEntityByYear, type NeedsEntityYear } from '../financials/transactionEntity'

// Entity books: the Action Queue's "Needs entity" item. Worked out from
// the transactions themselves each time the queue loads (no stored
// reminder rows), so it can never disagree with the ledger.
export function useNeedsEntity() {
  const { accountId } = useAuth()
  const [byYear, setByYear] = useState<NeedsEntityYear[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    let current = true
    Promise.all([listNeedsEntityDates(accountId), listLockedYears(accountId)]).then(([needs, locked]) => {
      if (!current) return
      const loadError = needs.error ?? locked.error
      setError(loadError ? `Couldn't check transactions needing an entity: ${loadError.message}` : null)
      setByYear(loadError ? [] : needsEntityByYear(needs.data ?? [], (locked.data ?? []).map((p) => p.year)))
    })
    return () => {
      current = false
    }
  }, [accountId])

  return { byYear, total: byYear.reduce((sum, y) => sum + y.count, 0), error }
}
