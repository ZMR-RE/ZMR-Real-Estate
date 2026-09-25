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
// per-property transactions view under its new tab label. Roadmap 7.26
// reverses the Activity & Documents merge — 'activityDocuments' split
// back into 'activity' (Activity Log + History/7.8) and 'documents'
// (2.5), per explicit user confirmation.
export type ProfileTab = 'overview' | 'financials' | 'mortgage' | 'kpi' | 'activity' | 'documents'

// Batch S1 — entering an existing property normally lands on KPI (the
// portfolio-headline landing view, per the owner's own stated workflow:
// once a property exists, KPI is "probably where they're headed
// first"); `initialTab` is the one explicit override, used right now
// only right after creating a brand-new property (it has no KPI data
// yet, so Overview — where the owner actually fills the property in —
// is the useful landing spot there instead). Any future caller that
// needs a specific starting tab uses this same param rather than a
// second hardcoded default.
export function usePropertyProfile(propertyId: string, initialTab: ProfileTab = 'kpi') {
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
  const [tab, setTab] = useState<ProfileTab>(initialTab)
  const [saving, setSaving] = useState(false)
  // Batch I5 — stale-edit protection. `conflict` holds the newer server row
  // when a save was refused because another editor saved first; the
  // user's draft stays untouched in the still-mounted form. `formResetKey`
  // changes only through an explicit "discard my changes" choice — the one
  // way the form is ever re-seeded from the latest row, never automatic.
  const [conflict, setConflict] = useState<Property | null>(null)
  const [formResetKey, setFormResetKey] = useState(0)

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
    if (!property) return false
    setSaving(true)
    // `property.updated_at` is the baseline this draft was edited against.
    // It is deliberately NOT advanced on conflict below, so a retried Save
    // re-checks against the same baseline and is refused again — the only
    // way past a conflict is the user's explicit discard-and-reload.
    const result = await updateProperty(propertyId, input, property.updated_at)
    setSaving(false)

    switch (result.kind) {
      case 'saved':
        setError(null)
        setConflict(null)
        setProperty(result.property)
        return true
      case 'conflict':
        setError(null)
        setConflict(result.latest)
        return false
      case 'not_found':
        setError('This property no longer exists or is no longer accessible.')
        return false
      default:
        setError(result.message)
        return false
    }
  }

  const keepEditingAfterConflict = () => setConflict(null)

  const discardDraftAndLoadLatest = () => {
    if (conflict) setProperty(conflict)
    setConflict(null)
    setFormResetKey((k) => k + 1)
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
    conflict,
    formResetKey,
    keepEditingAfterConflict,
    discardDraftAndLoadLatest,
    refresh,
  }
}
