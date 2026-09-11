import { useFinancialPeriodLock } from './useFinancialPeriodLock'

interface FinancialPeriodLockControlProps {
  year: number
}

export function FinancialPeriodLockControl({ year }: FinancialPeriodLockControlProps) {
  const { isLocked, loading, saving, error, lock, reopen } = useFinancialPeriodLock(year)

  if (loading) {
    return null
  }

  return (
    <div className="financial-period-lock">
      {error && <p role="alert">{error}</p>}
      <span>{year} is {isLocked ? 'locked' : 'open'}.</span>{' '}
      {isLocked ? (
        <button type="button" onClick={reopen} disabled={saving}>
          {saving ? 'Reopening…' : 'Reopen period'}
        </button>
      ) : (
        <button type="button" onClick={lock} disabled={saving}>
          {saving ? 'Locking…' : 'Lock period'}
        </button>
      )}
    </div>
  )
}
