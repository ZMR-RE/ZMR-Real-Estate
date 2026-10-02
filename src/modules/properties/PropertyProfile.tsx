import { Link, useLocation, useParams } from 'react-router-dom'
import { propertyLabel } from '../../shared/propertyLabel'
import { Breadcrumb } from '../../shared/Breadcrumb'
import { usePropertyProfile, type ProfileTab } from './usePropertyProfile'
import { PropertyProfileOverviewTab } from './PropertyProfileOverviewTab'
import { PropertyProfileTransactionsTab } from './PropertyProfileTransactionsTab'
import { PropertyProfileMortgageTab } from './PropertyProfileMortgageTab'
import { PropertyProfileActivityHistoryTab } from './PropertyProfileActivityHistoryTab'
import { PropertyProfileDocumentsTab } from './PropertyProfileDocumentsTab'
import { PropertyProfileKpiTab } from '../propertyKpi/PropertyProfileKpiTab'
import { useStickyHeaderHeight } from './useStickyHeaderHeight'

// Roadmap 7.9 — revised tab set. Roadmap 7.26 reverses the Activity &
// Documents merge back into two tabs.
// Roadmap 7.38 — KPI moved first: it's now the tab carrying the
// property's headline summary (KpiHeadline), quick stats, and the
// combined value/tax trend chart — the natural landing view, not a
// secondary analysis tab buried after Mortgage.
const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'kpi', label: 'KPI' },
  { key: 'overview', label: 'Overview' },
  { key: 'financials', label: 'Financials' },
  { key: 'mortgage', label: 'Mortgage' },
  { key: 'activity', label: 'Activity' },
  { key: 'documents', label: 'Documents' },
]

export function PropertyProfile() {
  const { id } = useParams<{ id: string }>()
  // Batch S1 — the one explicit-destination path today: navigating here
  // right after creating a new property passes { initialTab: 'overview' }
  // via router state (see usePropertyRegistry.save). Anything else
  // (clicking an existing property from the registry, a bookmark, back/
  // forward) has no state and gets usePropertyProfile's own 'kpi'
  // default. Router state travels with browser history entries natively,
  // so back/forward continues to land on whichever tab that entry opened
  // with, with no extra wiring needed here.
  const location = useLocation()
  const initialTab = (location.state as { initialTab?: ProfileTab } | null)?.initialTab
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
    conflict,
    formResetKey,
    keepEditingAfterConflict,
    discardDraftAndLoadLatest,
    refresh,
    latestMarketValue,
  } = usePropertyProfile(id!, initialTab)
  const { measureHeader, heightStyle } = useStickyHeaderHeight()

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
    <div className="property-profile" style={heightStyle}>
      <Breadcrumb to="/properties" label="Property registry" />
      {/* Addendum to roadmap 7.39 (2) — reversed: the header stays
          visible on every tab, Overview included. 7.39 (2) had hidden
          it there on the theory that the hero photo banner (7.34)
          already covers the address, but that was a miscommunication —
          confirmed the header must never be hidden on any tab. */}
      {/* Owner request (Oct 1, 2026): the address stays visible with the
          tabs while scrolling. Both sit in one sticky block (compact
          heading, wraps rather than truncating), measured live so sticky
          table headers below never slide underneath it. */}
      <div className="property-sticky-header" ref={measureHeader}>
        <div className="page-header-row">
          <h1 className="property-sticky-title">{propertyLabel(property)}</h1>
        </div>

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
      </div>
      {error && <p role="alert">{error}</p>}

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
          conflict={conflict}
          formResetKey={formResetKey}
          onKeepEditingAfterConflict={keepEditingAfterConflict}
          onDiscardDraftAndLoadLatest={discardDraftAndLoadLatest}
        />
      )}
      {tab === 'financials' && <PropertyProfileTransactionsTab transactions={transactions} />}
      {tab === 'mortgage' && (
        <PropertyProfileMortgageTab property={property} marketValue={latestMarketValue?.value ?? null} />
      )}
      {tab === 'kpi' && <PropertyProfileKpiTab property={property} transactions={transactions} />}
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
