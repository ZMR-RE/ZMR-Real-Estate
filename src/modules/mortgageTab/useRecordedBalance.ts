import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listRecordedPrincipal } from './mortgagePresentationQueries'
import { recordedPoints, type RecordedPoint } from './presentationLogic'
export function useRecordedBalance(loanId: string, version: number) {
  const { accountId } = useAuth()
  const [state, setState] = useState<{key: string; points: RecordedPoint[]; error: string | null}>({key: '', points: [], error: null})
  const key = `${accountId}:${loanId}:${version}`
  useEffect(() => {
    let active = true
    if (!accountId) return
    Promise.resolve(listRecordedPrincipal(accountId, loanId))
      .then(history => {
        if (!active) return
        const error = history.error
        setState({key, points: error ? [] : recordedPoints(history.data ?? []), error: error?.message ?? null})
      }).catch(() => { if (active) setState({key, points: [], error: 'Could not load recorded balance history.'}) })
    return () => { active = false }
  }, [accountId, loanId, version, key])
  return state.key === key ? {...state, loading: false} : {points: [], error: null, loading: true}
}
