import { Link, useParams } from 'react-router-dom'
import { propertyLabel } from '../../shared/propertyLabel'
import { usePropertyProfile, type ProfileTab } from './usePropertyProfile'
import { PropertyProfileOverviewTab } from './PropertyProfileOverviewTab'
import { PropertyProfileTransactionsTab } from './PropertyProfileTransactionsTab'
import { PropertyProfileMortgageTab } from './PropertyProfileMortgageTab'
import { PropertyProfileActivityHistoryTab } from './PropertyProfileActivityHistoryTab'
import { PropertyProfileDocumentsTab } from './PropertyProfileDocumentsTab'
import { PropertyProfileKpiTab } from '../propertyKpi/PropertyProfileKpiTab'

// Roadmap 7.9 — revised tab set. Roadmap 7.26 reverses the Activity &
// Documents merge back into two tabs.
const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'financials', label: 'Financials' },
  { key: 'mortgage', label: 'Mortgage' },
  { key: 'kpi', label: 'KPI' },
  { key: 'activity', label: 'Activity' },
  { key: 'documents', label: 'Documents' },
]

export function PropertyProfile() {
  const { id } = useParams<{ id: string }>()
  const {
    property,
    llcOptions,
    createLlc,
    holdingCompanyOptions,
    createHoldingCompany,
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
    refresh,
    latestMarketValue,
  } = usePropertyProfile(id!)

  // Root-cause fix: `loading` used to gate the whole page unconditionally,
  // so every refresh() call (not just the initial one) — including the
  // "just tell the Mortgage tab about a new market value entry" refreshes
  // fired from inside an EditableSection's Edit state (Market & rent
  // value history, roadmap 7.25) — unmounted this entire tree and
  // remounted it once data came back, silently resetting every box's own
  // isEditing state back to view. Only the true first load (no property
  // fetched yet) should block the page; a background refresh after that
  // updates data in place without tearing anything down.
  if (loading && !property) {
    return <p>Loading…</p>
  }

  if (!property) {
    return (
      <div>
        {error && <p role="alert">{error}</p>}
        <p>Property not found.</p>
        <Link to="/properties">Back to property registry</Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/properties">&larr; Property registry</Link>
      <div className="page-header-row">
        <h1>{propertyLabel(property)}</h1>
      </div>
      {error && <p role="alert">{error}</p>}

      <div className="tab-bar" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <PropertyProfileOverviewTab
          property={property}
          llcOptions={llcOptions}
          onCreateLlc={createLlc}
          holdingCompanyOptions={holdingCompanyOptions}
          onCreateHoldingCompany={createHoldingCompany}
          onValueHistoryChanged={refresh}
          saving={saving}
          onSave={saveProperty}
          transactions={transactions}
          activity={activity}
        />
      )}
      {tab === 'financials' && <PropertyProfileTransactionsTab transactions={transactions} />}
      {tab === 'mortgage' && (
        <PropertyProfileMortgageTab property={property} marketValue={latestMarketValue?.value ?? null} />
      )}
      {tab === 'kpi' && <PropertyProfileKpiTab propertyId={property.id} transactions={transactions} />}
      {tab === 'activity' && (
        <PropertyProfileActivityHistoryTab property={property} llcOptions={llcOptions} activity={activity} />
      )}
      {tab === 'documents' && (
        <PropertyProfileDocumentsTab
          propertyId={property.id}
          documents={documents}
          onView={viewDocument}
          onDocumentsChanged={refresh}
        />
      )}
    </div>
  )
}
