import { SearchableSelect } from '../../shared/SearchableSelect'
import { useReconciliationQueue } from './useReconciliationQueue'
import { ReconciliationList } from './ReconciliationList'

export function ReconciliationQueue() {
  const {
    entries,
    propertyOptions,
    propertyFilter,
    setPropertyFilter,
    loading,
    error,
    processingId,
    reconcile,
    viewAttachment,
  } = useReconciliationQueue()

  return (
    <div>
      <h1>Reconciliation Queue</h1>

      <label htmlFor="property_filter">Filter by property</label>
      <SearchableSelect
        options={propertyOptions}
        value={propertyFilter}
        onChange={setPropertyFilter}
        placeholder="All properties"
      />
      {propertyFilter && (
        <button type="button" onClick={() => setPropertyFilter(null)}>
          Clear filter
        </button>
      )}

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <ReconciliationList
          entries={entries}
          processingId={processingId}
          onViewAttachment={viewAttachment}
          onReconcile={reconcile}
        />
      )}
    </div>
  )
}
