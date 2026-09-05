import { Link, useParams } from 'react-router-dom'
import { usePropertyProfile, type ProfileTab } from './usePropertyProfile'
import { PropertyProfileOverviewTab } from './PropertyProfileOverviewTab'
import { PropertyProfileTransactionsTab } from './PropertyProfileTransactionsTab'
import { PropertyProfileActivityTab } from './PropertyProfileActivityTab'
import { PropertyProfileMortgageTab } from './PropertyProfileMortgageTab'
import { PropertyProfileDocumentsTab } from './PropertyProfileDocumentsTab'

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'activity', label: 'Activity Log' },
  { key: 'mortgage', label: 'Mortgage' },
  { key: 'documents', label: 'Documents' },
]

export function PropertyProfile() {
  const { id } = useParams<{ id: string }>()
  const {
    property,
    llcOptions,
    createLlc,
    transactions,
    activity,
    loading,
    error,
    tab,
    setTab,
    saving,
    saveProperty,
  } = usePropertyProfile(id!)

  if (loading) {
    return <p>Loading…</p>
  }

  if (!property) {
    return (
      <div>
        {error && <p role="alert">{error}</p>}
        <p>Property not found.</p>
        <Link to="/properties">Back to Property Registry</Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/properties">&larr; Property Registry</Link>
      <h1>{property.name}</h1>
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
          saving={saving}
          onSave={saveProperty}
        />
      )}
      {tab === 'transactions' && <PropertyProfileTransactionsTab transactions={transactions} />}
      {tab === 'activity' && <PropertyProfileActivityTab entries={activity} />}
      {tab === 'mortgage' && <PropertyProfileMortgageTab property={property} />}
      {tab === 'documents' && <PropertyProfileDocumentsTab />}
    </div>
  )
}
