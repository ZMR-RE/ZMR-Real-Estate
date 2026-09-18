import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useLlcs } from '../llcs/useLlcs'
import { useHoldingCompanies } from '../holdingCompanies/useHoldingCompanies'
import { listProperties, updateProperty, type Property, type PropertyInput } from './propertiesQueries'
import { listTransactions, type Transaction } from '../financials/financialsQueries'
import { listActivityLog, type ActivityLogEntry } from '../capture/captureQueries'
import { getDocumentSignedUrl, listDocuments, type DocumentRecord } from '../documents/documentsQueries'
import { getLatestValue, type LatestPropertyValue } from '../propertyValueHistory/propertyValueHistoryQueries'

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
  const [latestMarketValue, setLatestMarketValue] = useState<LatestPropertyValue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTabState] = useState<ProfileTab>('overview')
  const [saving, setSaving] = useState(false)
  const [editingProperty, setEditingProperty] = useState(false)

  // Roadmap 7.16 — the Edit action lives in the screen header now, not
  // at the bottom of the Overview tab's form, so its on/off state has to
  // live here (the tab only renders Overview conditionally) rather than
  // inside PropertyProfileOverviewTab. Switching tabs away from Overview
  // always drops out of edit mode — editing only makes sense while
  // looking at the fields being edited.
  const setTab = (next: ProfileTab) => {
    setEditingProperty(false)
    setTabState(next)
  }

  // Root-cause fix: this used to gate every piece of state behind ALL
  // five fetches succeeding — if any one of them errored (transactions,
  // activity, documents, or market value, none of which have anything to
  // do with the property's own fields), the whole function returned
  // early and `setProperty` was never called. Editing a property calls
  // this via saveProperty() to reflect the save, so a transient failure
  // in any one of those unrelated queries silently made every property
  // edit look like it "didn't save" — the update had actually succeeded
  // in the DB, but the screen kept showing stale pre-edit data with no
  // clear signal why. Each result is now applied independently so one
  // query's failure can no longer block the others' state from updating.
  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const [propertiesRes, transactionsRes, activityRes, documentsRes, latestMarketValueRes] = await Promise.all([
      listProperties(accountId),
      listTransactions(accountId, { propertyId }),
      listActivityLog(accountId, propertyId),
      listDocuments(accountId, propertyId),
      getLatestValue(accountId, propertyId, 'market_value'),
    ])
    setLoading(false)

    const fetchError =
      propertiesRes.error?.message ??
      transactionsRes.error?.message ??
      activityRes.error?.message ??
      documentsRes.error?.message ??
      latestMarketValueRes.error?.message
    setError(fetchError ?? null)

    if (propertiesRes.data) {
      setProperty(propertiesRes.data.find((p) => p.id === propertyId) ?? null)
    }
    if (transactionsRes.data) {
      setTransactions(transactionsRes.data)
    }
    if (activityRes.data) {
      setActivity(activityRes.data)
    }
    if (documentsRes.data) {
      setDocuments(documentsRes.data)
    }
    if (!latestMarketValueRes.error) {
      setLatestMarketValue(latestMarketValueRes.data ?? null)
    }
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

  // Reflects the save from updateProperty's own returned row, not from a
  // follow-up refresh() — the property's fields are already right there
  // in the update response, so displaying the save no longer depends on
  // transactions/activity/documents/market-value queries succeeding too.
  const saveProperty = async (input: PropertyInput): Promise<boolean> => {
    setSaving(true)
    const { data, error: saveError } = await updateProperty(propertyId, input)
    setSaving(false)
    if (saveError || !data) {
      setError(saveError?.message ?? 'Could not save property')
      return false
    }
    setError(null)
    setProperty(data)
    setEditingProperty(false)
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
    latestMarketValue,
    viewDocument,
    loading,
    error,
    tab,
    setTab,
    saving,
    saveProperty,
    editingProperty,
    setEditingProperty,
    refresh,
  }
}
