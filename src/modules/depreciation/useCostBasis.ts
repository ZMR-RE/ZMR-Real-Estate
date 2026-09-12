import { useCallback, useEffect, useState } from 'react'
import { listCapitalImprovementAmounts } from './depreciationQueries'

export function useCostBasis(propertyId: string) {
  const [capitalImprovements, setCapitalImprovements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchError } = await listCapitalImprovementAmounts(propertyId)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setCapitalImprovements((data ?? []).reduce((sum, row) => sum + row.amount, 0))
  }, [propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { capitalImprovements, loading, error }
}
