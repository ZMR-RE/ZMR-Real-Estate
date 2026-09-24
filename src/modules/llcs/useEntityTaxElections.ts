import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createTaxElection,
  listTaxElections,
  supersedeTaxElection,
  updateTaxElectionStatus,
  type LlcTaxElection,
  type LlcTaxElectionInput,
} from './llcsQueries'

// Election history business logic — a mid-flight status update
// (Submitted -> Accepted) mutates the same row via updateStatus; a
// genuinely different election calls supersede, which inserts a new row
// and marks the old one 'superseded' without touching its own facts (3B).
export function useEntityTaxElections(llcId: string) {
  const { accountId, session } = useAuth()
  const [elections, setElections] = useState<LlcTaxElection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listTaxElections(accountId, llcId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setElections(data ?? [])
  }, [accountId, llcId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = async (input: LlcTaxElectionInput) => {
    if (!accountId || !session) return false
    setSaving(true)
    const { error: saveError } = await createTaxElection(accountId, llcId, input, session.user.id)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  const updateStatus = async (id: string, status: LlcTaxElection['status'], acceptanceDate: string | null) => {
    if (!session) return false
    setSaving(true)
    const { error: saveError } = await updateTaxElectionStatus(id, status, acceptanceDate, session.user.id)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  const supersede = async (oldElectionId: string, input: LlcTaxElectionInput) => {
    if (!accountId || !session) return false
    setSaving(true)
    const { error: saveError } = await supersedeTaxElection(accountId, llcId, oldElectionId, input, session.user.id)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  return { elections, loading, error, saving, add, updateStatus, supersede }
}
