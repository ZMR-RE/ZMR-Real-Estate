import { useCallback, useEffect, useState } from 'react'
import { createHoldingCompany, listHoldingCompanies, type HoldingCompanyInput } from './holdingCompaniesQueries'

export interface HoldingCompanyOption {
  id: string
  label: string
}

// Sentinel id for "this LLC has no Holding Company" as an explicit,
// chosen option in the picker — distinct from a blank/unset field.
// Never collides with a real holding_companies.id, which is always a
// uuid. Mirrors NO_LLC_ID (useLlcs.ts); callers map this back to a null
// holding_company_id when saving.
export const NO_HOLDING_COMPANY_ID = 'no-holding-company'

const NO_HOLDING_COMPANY_OPTION: HoldingCompanyOption = { id: NO_HOLDING_COMPANY_ID, label: 'No Holding Company' }

// Mirrors useLlcs's fetch-options-plus-create-new shape so the LLC
// picker's own "+ Add new Holding Company" flow can reuse it.
export function useHoldingCompanies(accountId: string | null) {
  const [realOptions, setRealOptions] = useState<HoldingCompanyOption[]>([])

  const refresh = useCallback(async () => {
    if (!accountId) return
    const { data } = await listHoldingCompanies(accountId)
    setRealOptions((data ?? []).map((hc) => ({ id: hc.id, label: hc.name })))
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addHoldingCompany = async (input: HoldingCompanyInput): Promise<{ id: string } | { error: string }> => {
    if (!accountId) return { error: 'No account selected' }
    const { data, error } = await createHoldingCompany(accountId, input)
    if (error || !data) {
      return { error: error?.message ?? 'Could not create Holding Company' }
    }
    setRealOptions((prev) =>
      [...prev, { id: data.id, label: data.name }].sort((a, b) => a.label.localeCompare(b.label)),
    )
    return { id: data.id }
  }

  return { holdingCompanyOptions: [NO_HOLDING_COMPANY_OPTION, ...realOptions], addHoldingCompany }
}
