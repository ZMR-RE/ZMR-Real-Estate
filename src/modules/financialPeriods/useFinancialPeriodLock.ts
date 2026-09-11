import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getFinancialPeriod, lockPeriod, reopenPeriod, type FinancialPeriod } from './financialPeriodsQueries'

// Roadmap 9.19 — lock/reopen control for the financial period (year)
// Financials is already filtered to. Tracks just this one year's period;
// Financials.tsx passes whichever year its own filter is set to.
export function useFinancialPeriodLock(year: number) {
  const { accountId } = useAuth()
  const [period, setPeriod] = useState<FinancialPeriod | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await getFinancialPeriod(accountId, year)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setError(null)
    setPeriod(data ?? null)
  }, [accountId, year])

  useEffect(() => {
    refresh()
  }, [refresh])

  const lock = async () => {
    if (!accountId) return
    setSaving(true)
    const { data, error: lockError } = await lockPeriod(accountId, year, period?.id ?? null)
    setSaving(false)

    if (lockError) {
      setError(lockError.message)
      return
    }

    setError(null)
    setPeriod(data)
  }

  const reopen = async () => {
    if (!period) return
    setSaving(true)
    const { data, error: reopenError } = await reopenPeriod(period.id)
    setSaving(false)

    if (reopenError) {
      setError(reopenError.message)
      return
    }

    setError(null)
    setPeriod(data)
  }

  return {
    isLocked: period?.status === 'locked',
    loading,
    saving,
    error,
    lock,
    reopen,
  }
}
