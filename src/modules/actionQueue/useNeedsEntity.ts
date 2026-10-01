import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listNeedsEntityDates } from '../financials/transactionEntityQueries'
import { needsEntityByYear } from '../financials/transactionEntity'

// Entity books: the Action Queue's "Needs entity" item. Worked out from
// the transactions themselves each time the queue loads (no stored
// reminder rows), so it can never disagree with the ledger.
export function useNeedsEntity() {
  const { accountId } = useAuth()
  const [byYear, setByYear] = useState<{ year: number; count: number }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    let current = true
    listNeedsEntityDates(accountId).then(({ data, error: loadError }) => {
      if (!current) return
      setError(loadError ? `Couldn't check transactions needing an entity: ${loadError.message}` : null)
      setByYear(loadError ? [] : needsEntityByYear(data ?? []))
    })
    return () => {
      current = false
    }
  }, [accountId])

  return { byYear, total: byYear.reduce((sum, y) => sum + y.count, 0), error }
}
