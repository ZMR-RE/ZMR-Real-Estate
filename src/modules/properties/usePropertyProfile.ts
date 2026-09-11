import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useLlcs } from '../llcs/useLlcs'
import { listProperties, updateProperty, type Property, type PropertyInput } from './propertiesQueries'
import { listTransactions, type Transaction } from '../financials/financialsQueries'
import { listActivityLog, type ActivityLogEntry } from '../capture/captureQueries'
import { getDocumentSignedUrl, listDocuments, type DocumentRecord } from '../documents/documentsQueries'

export type ProfileTab = 'overview' | 'transactions' | 'activity' | 'mortgage' | 'documents'

export function usePropertyProfile(propertyId: string) {
  const { accountId } = useAuth()
  const [property, setProperty] = useState<Property | null>(null)
  const { llcOptions, addLlc } = useLlcs(accountId)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activity, setActivity] = useState<ActivityLogEntry[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<ProfileTab>('overview')
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const [propertiesRes, transactionsRes, activityRes, documentsRes] = await Promise.all([
      listProperties(accountId),
      listTransactions(accountId, { propertyId }),
      listActivityLog(accountId, propertyId),
      listDocuments(accountId, propertyId),
    ])
    setLoading(false)

    const fetchError =
      propertiesRes.error?.message ??
      transactionsRes.error?.message ??
      activityRes.error?.message ??
      documentsRes.error?.message
    if (fetchError) {
      setError(fetchError)
      return
    }

    setError(null)
    setProperty((propertiesRes.data ?? []).find((p) => p.id === propertyId) ?? null)
    setTransactions(transactionsRes.data ?? [])
    setActivity(activityRes.data ?? [])
    setDocuments(documentsRes.data ?? [])
  }, [accountId, propertyId])

  const viewDocument = async (path: string) => {
    const { data, error: urlError } = await getDocumentSignedUrl(path)
    if (urlError || !data) {
      setError(urlError?.message ?? 'Could not load document')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

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
    documents,
    viewDocument,
    loading,
    error,
    tab,
    setTab,
    saving,
    saveProperty,
  }
}
