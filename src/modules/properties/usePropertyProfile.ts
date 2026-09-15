import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useLlcs } from '../llcs/useLlcs'
import { useHoldingCompanies } from '../holdingCompanies/useHoldingCompanies'
import { listProperties, updateProperty, type Property, type PropertyInput } from './propertiesQueries'
import { listTransactions, type Transaction } from '../financials/financialsQueries'
import { listActivityLog, type ActivityLogEntry } from '../capture/captureQueries'
import { getDocumentSignedUrl, listDocuments, type DocumentRecord } from '../documents/documentsQueries'

// Roadmap 7.9 — revised tab set: Overview, Financials, Mortgage, KPI,
// Activity & Documents (merged). 'financials' reuses the existing
// per-property transactions view under its new tab label; 'activityDocuments'
// merges what were three separate tabs (Activity Log, History/7.8,
// Documents/2.5) into collapsible boxes on one tab (7.14).
export type ProfileTab = 'overview' | 'financials' | 'mortgage' | 'kpi' | 'activityDocuments'

export function usePropertyProfile(propertyId: string) {
  const { accountId } = useAuth()
  const [property, setProperty] = useState<Property | null>(null)
  const { llcOptions, addLlc } = useLlcs(accountId)
  const { holdingCompanyOptions, addHoldingCompany } = useHoldingCompanies(accountId)
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

  const saveProperty = async (input: PropertyInput): Promise<boolean> => {
    setSaving(true)
    const { error: saveError } = await updateProperty(propertyId, input)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  return {
    property,
    llcOptions,
    createLlc: addLlc,
    holdingCompanyOptions,
    createHoldingCompany: addHoldingCompany,
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
