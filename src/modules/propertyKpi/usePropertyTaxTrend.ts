import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listTaxInstallments } from '../propertyTax/propertyTaxQueries'

export interface PropertyTaxTrendYear {
  taxYear: number
  total: number
  changeFromPriorYear: number | null
  changePercent: number | null
}

// Roadmap 7.24 — the "KPI tax-trend card" 9.5 named as this data's
// eventual destination when it was originally built. Reads the same
// property_tax_installments rows the Overview tab's ledger (9.5) already
// manages — no new table, no duplicate storage — summed per year
// (installment 1 + installment 2) and compared to the prior year on file.
export function usePropertyTaxTrend(propertyId: string) {
  const { accountId } = useAuth()
  const [years, setYears] = useState<PropertyTaxTrendYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listTaxInstallments(accountId, propertyId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)

    const sorted = [...(data ?? [])].sort((a, b) => a.tax_year - b.tax_year)
    const computed: PropertyTaxTrendYear[] = []
    let priorTotal: number | null = null
    for (const installment of sorted) {
      const total = Number(installment.installment_1_amount ?? 0) + Number(installment.installment_2_amount ?? 0)
      const changeFromPriorYear = priorTotal === null ? null : total - priorTotal
      const changePercent = priorTotal === null || priorTotal === 0 ? null : (total - priorTotal) / priorTotal
      computed.push({ taxYear: installment.tax_year, total, changeFromPriorYear, changePercent })
      priorTotal = total
    }
    setYears(computed)
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { years, loading, error }
}
