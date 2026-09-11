import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listMileageForRollup } from './mileageQueries'
import { summarizeMileageByProperty, type MileageByProperty } from './mileageCalculations'

// Rollup for the Financials (2.3) mileage summary (roadmap 9.10). Takes
// the same year the Financials screen is already filtering transactions
// by, so the two summaries stay in sync without a second filter control.
export function useMileageRollup(year: number) {
  const { accountId } = useAuth()
  const [summary, setSummary] = useState<MileageByProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listMileageForRollup(accountId, { year })
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setError(null)
    setSummary(summarizeMileageByProperty(data ?? []))
  }, [accountId, year])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { summary, loading, error }
}
