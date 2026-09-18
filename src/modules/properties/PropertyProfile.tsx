import { Link, useParams } from 'react-router-dom'
import { propertyLabel } from '../../shared/propertyLabel'
import { usePropertyProfile, type ProfileTab } from './usePropertyProfile'
import { PropertyProfileOverviewTab } from './PropertyProfileOverviewTab'
import { PropertyProfileTransactionsTab } from './PropertyProfileTransactionsTab'
import { PropertyProfileMortgageTab } from './PropertyProfileMortgageTab'
import { PropertyProfileActivityDocumentsTab } from './PropertyProfileActivityDocumentsTab'
import { PropertyProfileKpiTab } from '../propertyKpi/PropertyProfileKpiTab'

// Roadmap 7.9 — revised tab set.
const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'financials', label: 'Financials' },
  { key: 'mortgage', label: 'Mortgage' },
  { key: 'kpi', label: 'KPI' },
  { key: 'activityDocuments', label: 'Activity & Documents' },
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
    editingProperty,
    setEditingProperty,
    refresh,
    latestMarketValue,
  } = usePropertyProfile(id!)

  if (loading) {
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
        {tab === 'overview' && !editingProperty && (
          <button type="button" onClick={() => setEditingProperty(true)}>
            Edit property
          </button>
        )}
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
          isEditing={editingProperty}
          onStartEditing={() => setEditingProperty(true)}
          onCancelEdit={() => setEditingProperty(false)}
          llcOptions={llcOptions}
          onCreateLlc={createLlc}
          holdingCompanyOptions={holdingCompanyOptions}
          onCreateHoldingCompany={createHoldingCompany}
          documents={documents}
          onViewDocument={viewDocument}
          onValueHistoryChanged={refresh}
          saving={saving}
          onSave={saveProperty}
        />
      )}
      {tab === 'financials' && <PropertyProfileTransactionsTab transactions={transactions} />}
      {tab === 'mortgage' && (
        <PropertyProfileMortgageTab property={property} marketValue={latestMarketValue?.value ?? null} />
      )}
      {tab === 'kpi' && <PropertyProfileKpiTab propertyId={property.id} transactions={transactions} />}
      {tab === 'activityDocuments' && (
        <PropertyProfileActivityDocumentsTab
          property={property}
          llcOptions={llcOptions}
          activity={activity}
          documents={documents}
          onViewDocument={viewDocument}
          onDocumentsChanged={refresh}
        />
      )}
    </div>
  )
}
