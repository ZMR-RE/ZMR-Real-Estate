import { useCallback, useEffect, useState } from 'react'
import { createLlc, listLlcs, type LlcInput } from './llcsQueries'

export interface LlcOption {
  id: string
  label: string
}

// Shared by any module that needs an LLC picker (Property Registry, the
// Property Profile Overview tab) so the fetch-options-plus-create-new
// logic lives in one place instead of being copied per caller.
export function useLlcs(accountId: string | null) {
  const [llcOptions, setLlcOptions] = useState<LlcOption[]>([])

  const refresh = useCallback(async () => {
    if (!accountId) return
    const { data } = await listLlcs(accountId)
    setLlcOptions((data ?? []).map((llc) => ({ id: llc.id, label: llc.name })))
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
    setLlcOptions((prev) =>
      [...prev, { id: data.id, label: data.name }].sort((a, b) => a.label.localeCompare(b.label)),
    )
    return { id: data.id }
  }

  return { llcOptions, addLlc }
}
