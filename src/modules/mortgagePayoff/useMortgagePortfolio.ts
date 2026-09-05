import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listPortfolioMortgages } from './mortgagePayoffQueries'
import {
  computePortfolioTotals,
  type PortfolioMortgageEntry,
  type PortfolioTotals,
} from './mortgagePayoffMath'

export function useMortgagePortfolio() {
  const { accountId } = useAuth()
  const [entries, setEntries] = useState<PortfolioMortgageEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listPortfolioMortgages(accountId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setError(null)
    setEntries(
      (data ?? []).map((row) => ({
        propertyId: row.property_id,
        propertyName: row.property?.name ?? 'Unknown property',
        marketValue: row.property?.market_value ? Number(row.property.market_value) : null,
        currentBalance: Number(row.current_balance),
      })),
    )
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const totals: PortfolioTotals = computePortfolioTotals(entries)

  return { entries, totals, loading, error }
}
