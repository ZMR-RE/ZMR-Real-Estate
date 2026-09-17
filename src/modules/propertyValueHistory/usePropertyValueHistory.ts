import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createValueLogEntry,
  listValueLog,
  voidValueLogEntry,
  type PropertyValueLogEntry,
  type PropertyValueLogInput,
  type ValueMetric,
} from './propertyValueHistoryQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

const BLANK_ENTRY: PropertyValueLogInput = {
  entry_date: todayDateString(),
  value: '',
  source: '',
}

// The property_value_logs ledger (roadmap 7.19) for one property + one
// metric (market_value or rent_value) — parameterized so the same hook
// backs both of the Overview tab's history sections. Append-only + void,
// same pattern as useMortgageEscrow.
export function usePropertyValueHistory(propertyId: string, metric: ValueMetric) {
  const { accountId } = useAuth()

  const [entries, setEntries] = useState<PropertyValueLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchError } = await listValueLog(propertyId, metric)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setError(null)
    setEntries(data ?? [])
  }, [propertyId, metric])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addEntry = async (input: PropertyValueLogInput): Promise<boolean> => {
    if (!accountId) return false

    setSaving(true)
    const { error: saveError } = await createValueLogEntry(accountId, propertyId, metric, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return false
    }

    setError(null)
    await refresh()
    return true
  }

  const voidEntry = async (id: string): Promise<boolean> => {
    setSaving(true)
    const { error: voidError } = await voidValueLogEntry(id)
    setSaving(false)

    if (voidError) {
      setError(voidError.message)
      return false
    }

    setError(null)
    await refresh()
    return true
  }

  return {
    entries,
    loading,
    error,
    saving,
    formInitialValues: BLANK_ENTRY,
    addEntry,
    voidEntry,
  }
}
