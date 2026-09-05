import { useCallback, useEffect, useState } from 'react'
import { createLlc, listLlcs, type LlcInput } from './llcsQueries'

export interface LlcOption {
  id: string
  label: string
}

// Sentinel id for "this property has no LLC" as an explicit, chosen option
// in the picker — distinct from a blank/unset field. Never collides with a
// real llcs.id, which is always a uuid. Callers map this back to a null
// llc_id when saving.
export const NO_LLC_ID = 'no-llc'

const NO_LLC_OPTION: LlcOption = { id: NO_LLC_ID, label: 'Individually owned / No LLC' }

// Shared by any module that needs an LLC picker (Property Registry, the
// Property Profile Overview tab) so the fetch-options-plus-create-new
// logic lives in one place instead of being copied per caller.
export function useLlcs(accountId: string | null) {
  const [realLlcOptions, setRealLlcOptions] = useState<LlcOption[]>([])

  const refresh = useCallback(async () => {
    if (!accountId) return
    const { data } = await listLlcs(accountId)
    setRealLlcOptions((data ?? []).map((llc) => ({ id: llc.id, label: llc.name })))
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addLlc = async (input: LlcInput): Promise<{ id: string } | { error: string }> => {
    if (!accountId) return { error: 'No account selected' }
    const { data, error } = await createLlc(accountId, input)
    if (error || !data) {
      return { error: error?.message ?? 'Could not create LLC' }
    }
    setRealLlcOptions((prev) =>
      [...prev, { id: data.id, label: data.name }].sort((a, b) => a.label.localeCompare(b.label)),
    )
    return { id: data.id }
  }

  return { llcOptions: [NO_LLC_OPTION, ...realLlcOptions], addLlc }
}
