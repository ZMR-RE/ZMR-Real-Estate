import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useLlcs } from '../llcs/useLlcs'
import { listProperties, updateProperty, type Property, type PropertyInput } from './propertiesQueries'
import { listTransactions, type Transaction } from '../financials/financialsQueries'
import { listActivityLog, type ActivityLogEntry } from '../capture/captureQueries'

export type ProfileTab = 'overview' | 'transactions' | 'activity' | 'documents'

export function usePropertyProfile(propertyId: string) {
  const { accountId } = useAuth()
  const [property, setProperty] = useState<Property | null>(null)
  const { llcOptions, addLlc } = useLlcs(accountId)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activity, setActivity] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<ProfileTab>('overview')
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const [propertiesRes, transactionsRes, activityRes] = await Promise.all([
      listProperties(accountId),
      listTransactions(accountId, { propertyId }),
      listActivityLog(accountId, propertyId),
    ])
    setLoading(false)

    const fetchError =
      propertiesRes.error?.message ?? transactionsRes.error?.message ?? activityRes.error?.message
    if (fetchError) {
      setError(fetchError)
      return
    }

    setError(null)
    setProperty((propertiesRes.data ?? []).find((p) => p.id === propertyId) ?? null)
    setTransactions(transactionsRes.data ?? [])
    setActivity(activityRes.data ?? [])
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveProperty = async (input: PropertyInput) => {
    setSaving(true)
    const { error: saveError } = await updateProperty(propertyId, input)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return {
    property,
    llcOptions,
    createLlc: addLlc,
    transactions,
    activity,
    loading,
    error,
    tab,
    setTab,
    saving,
    saveProperty,
  }
}
