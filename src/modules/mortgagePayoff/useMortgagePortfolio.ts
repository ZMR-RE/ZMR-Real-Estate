import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listPortfolioMortgages } from './mortgagePayoffQueries'
import { listLatestValuesForAccount } from '../propertyValueHistory/propertyValueHistoryQueries'
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
    const [{ data, error: fetchError }, { data: latestValues, error: valuesError }] = await Promise.all([
      listPortfolioMortgages(accountId),
      listLatestValuesForAccount(accountId, 'market_value'),
    ])
    setLoading(false)

    const combinedError = fetchError?.message ?? valuesError?.message
    if (combinedError) {
      setError(combinedError)
      return
    }

    const marketValueByProperty = new Map((latestValues ?? []).map((v) => [v.property_id, Number(v.value)]))

    setError(null)
    setEntries(
      (data ?? []).map((row) => ({
        propertyId: row.property_id,
        propertyName: propertyLabel(row.property),
        marketValue: marketValueByProperty.get(row.property_id) ?? null,
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
