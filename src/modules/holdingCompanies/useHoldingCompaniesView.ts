import { useCallback, useEffect, useState } from 'react'
import { listLlcs } from '../llcs/llcsQueries'
import { listHoldingCompanies, type HoldingCompany } from './holdingCompaniesQueries'

export interface HoldingCompanyWithLlcs extends HoldingCompany {
  llcNames: string[]
}

// Roadmap 8.2b — "which LLCs does a given Holding Company own" was data
// that already existed (8.7's holding_company_id on llcs) with no
// display anywhere. Reuses listLlcs (already selects holding_company_id)
// rather than a new query — this is purely a client-side grouping of two
// lists that already exist.
export function useHoldingCompaniesView(accountId: string | null) {
  const [holdingCompanies, setHoldingCompanies] = useState<HoldingCompanyWithLlcs[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const [holdingCompaniesRes, llcsRes] = await Promise.all([listHoldingCompanies(accountId), listLlcs(accountId)])
    setLoading(false)

    const fetchError = holdingCompaniesRes.error?.message ?? llcsRes.error?.message
    if (fetchError) {
      setError(fetchError)
      return
    }
    setError(null)

    const llcs = llcsRes.data ?? []
    setHoldingCompanies(
      (holdingCompaniesRes.data ?? []).map((holdingCompany) => ({
        ...holdingCompany,
        llcNames: llcs.filter((llc) => llc.holding_company_id === holdingCompany.id).map((llc) => llc.name),
      })),
    )
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { holdingCompanies, loading, error }
}
